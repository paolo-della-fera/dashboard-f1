import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getSchedule } from '../../api/index.ts'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import { createQueryClient } from '../../hooks/queryClient.ts'
import CalendarPage from '../CalendarPage.tsx'

vi.mock('../../api/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/index.ts')>()
  return { ...original, getSchedule: vi.fn() }
})

// 10 March 2026, 12:00 UTC: round 1 is over, round 2 is next.
const NOW = Date.UTC(2026, 2, 10, 12)

const season2026 = [
  makeRace(2026, 1, { raceName: 'Gran Premio d\'Australia', date: '2026-03-08', time: '04:00:00Z' }),
  makeRace(2026, 2, {
    raceName: 'Gran Premio di Cina',
    date: '2026-03-15',
    time: '07:00:00Z',
    Sprint: { date: '2026-03-14', time: '03:00:00Z' },
  }),
  makeRace(2026, 3, { raceName: 'Gran Premio del Giappone', date: '2026-03-29', time: '05:00:00Z' }),
]

const season1988 = [
  makeRace(1988, 1, { raceName: 'Brazilian Grand Prix', date: '1988-04-03' }),
  makeRace(1988, 2, { raceName: 'San Marino Grand Prix', date: '1988-05-01' }),
]

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderPage(path = '/calendario') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="risultati/:season/:round" element={<p>Pagina risultati</p>} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    vi.mocked(getSchedule).mockReset()
    vi.mocked(getSchedule).mockImplementation(async (season) =>
      season === 1988 ? season1988 : season2026,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows loading, then the current season with the next race', async () => {
    renderPage()

    expect(screen.getByText('Caricamento del calendario…')).toBeInTheDocument()
    const card = await screen.findByRole('region', { name: /Gran Premio di Cina/ })
    expect(getSchedule).toHaveBeenCalledWith(2026)
    expect(within(card).getByText(/Prossima gara/)).toBeInTheDocument()
    expect(within(card).getByText('Sprint')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('counts down every second', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: /Gran Premio di Cina/ })
    // 15 Mar 07:00 - 10 Mar 12:00 = 4 days 19 hours.
    expect(within(card).getByText(/Mancano 4 giorni, 19 ore e 0 minuti/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(within(card).getByText(/Mancano 4 giorni, 18 ore e 58 minuti/)).toBeInTheDocument()
  })

  it('links to results only for concluded races', async () => {
    renderPage()
    await screen.findByRole('region', { name: /Gran Premio di Cina/ })

    const links = screen.getAllByRole('link', { name: /^Risultati/ })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/risultati/2026/1')
  })

  it('shows a historic season from the URL without next race card', async () => {
    renderPage('/calendario?stagione=1988')

    expect(await screen.findByText('Brazilian Grand Prix')).toBeInTheDocument()
    expect(getSchedule).toHaveBeenCalledWith(1988)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.getByText('3 apr 1988')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^Risultati/ })).toHaveLength(2)
  })

  it('changes season from the selector and updates the URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()
    await screen.findByRole('region', { name: /Gran Premio di Cina/ })

    await user.selectOptions(screen.getByLabelText('Stagione'), '1988')

    expect(await screen.findByText('Brazilian Grand Prix')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/calendario?stagione=1988')
  })

  it('says when the current season is over', async () => {
    vi.setSystemTime(Date.UTC(2026, 11, 20))
    renderPage()
    expect(await screen.findByText('La stagione 2026 è conclusa.')).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('handles an empty schedule', async () => {
    vi.mocked(getSchedule).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/non ancora disponibile/)).toBeInTheDocument()
  })

  it('shows a specific message when rate limited', async () => {
    vi.mocked(getSchedule).mockRejectedValue(
      new ApiError('limit', { rateLimited: true, retryAfterMs: 5 * 60_000 }),
    )
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/Riprova tra circa 5 minuti/)
  })

  it('shows a generic error message', async () => {
    vi.mocked(getSchedule).mockRejectedValue(new ApiError('boom', { status: 500 }))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossibile caricare i dati/)
  })
})
