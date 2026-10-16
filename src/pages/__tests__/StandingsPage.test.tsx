import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  getConstructorStandings,
  getConstructorStandingsAfterRound,
  getDriverStandings,
  getDriverStandingsAfterRound,
  getSchedule,
} from '../../api/index.ts'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import { createQueryClient } from '../../hooks/queryClient.ts'
import type { ConstructorStanding, DriverStanding } from '../../types/jolpica.ts'
import StandingsPage from '../StandingsPage.tsx'

vi.mock('../../api/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/index.ts')>()
  return {
    ...original,
    getSchedule: vi.fn(),
    getDriverStandings: vi.fn(),
    getConstructorStandings: vi.fn(),
    getDriverStandingsAfterRound: vi.fn(),
    getConstructorStandingsAfterRound: vi.fn(),
  }
})

// 20 March 2026: rounds 1 and 2 are over, round 3 is still to come.
const NOW = Date.UTC(2026, 2, 20, 12)

function driver(
  id: string,
  familyName: string,
  points: string,
  extra: Partial<DriverStanding> = {},
): DriverStanding {
  return {
    position: '1',
    positionText: '1',
    points,
    wins: '1',
    Driver: { driverId: id, givenName: 'Nome', familyName },
    Constructors: [{ constructorId: 'mclaren', name: 'McLaren' }],
    ...extra,
  }
}

function team(id: string, name: string, points: string): ConstructorStanding {
  return { position: '1', positionText: '1', points, wins: '2', Constructor: { constructorId: id, name } }
}

const schedule2026 = [
  makeRace(2026, 1, { raceName: "Gran Premio d'Australia", date: '2026-03-08', time: '04:00:00Z' }),
  makeRace(2026, 2, { raceName: 'Gran Premio di Cina', date: '2026-03-15', time: '07:00:00Z' }),
  makeRace(2026, 3, { raceName: 'Gran Premio del Giappone', date: '2026-03-29', time: '05:00:00Z' }),
]

const drivers2026 = [
  driver('norris', 'Norris', '43', { position: '1', positionText: '1' }),
  driver('piastri', 'Piastri', '36', { position: '2', positionText: '2' }),
]

const drivers1997 = [
  driver('villeneuve', 'Villeneuve', '81', { position: '1', positionText: '1' }),
  driver('michael_schumacher', 'Schumacher', '78', { position: '22', positionText: 'D' }),
]

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderPage(path = '/classifiche') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="classifiche" element={<StandingsPage />} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StandingsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    vi.mocked(getSchedule).mockReset().mockResolvedValue(schedule2026)
    vi.mocked(getDriverStandings)
      .mockReset()
      .mockImplementation(async (season) => (season === 1997 ? drivers1997 : drivers2026))
    vi.mocked(getConstructorStandings)
      .mockReset()
      .mockResolvedValue([team('mclaren', 'McLaren', '79')])
    vi.mocked(getDriverStandingsAfterRound)
      .mockReset()
      .mockImplementation(async (_season, round) =>
        round === 1 ? [driver('norris', 'Norris', '25'), driver('piastri', 'Piastri', '18')] : drivers2026,
      )
    vi.mocked(getConstructorStandingsAfterRound)
      .mockReset()
      .mockImplementation(async (_season, round) => [team('mclaren', 'McLaren', round === 1 ? '43' : '79')])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows loading, then the driver standings of the current season', async () => {
    renderPage()

    expect(screen.getByText('Caricamento della classifica…')).toBeInTheDocument()
    const norrisRow = (await screen.findByText('Nome Norris')).closest('tr')
    expect(norrisRow).not.toBeNull()
    expect(within(norrisRow as HTMLElement).getByText('McLaren')).toBeInTheDocument()
    expect(within(norrisRow as HTMLElement).getByText('43')).toBeInTheDocument()
    expect(getDriverStandings).toHaveBeenCalledWith(2026)
    expect(screen.getByRole('tab', { name: 'Piloti' })).toHaveAttribute('aria-selected', 'true')
  })

  it('loads the chart from the standings after each completed round only', async () => {
    renderPage()

    const legend = await screen.findByRole('list', { name: 'Legenda' })
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Nome Norris',
      'Nome Piastri',
    ])
    expect(screen.getByRole('heading', { level: 2, name: 'Andamento dei punti' })).toBeInTheDocument()
    expect(getDriverStandingsAfterRound).toHaveBeenCalledTimes(2)
    expect(getDriverStandingsAfterRound).toHaveBeenCalledWith(2026, 1)
    expect(getDriverStandingsAfterRound).toHaveBeenCalledWith(2026, 2)
  })

  it('limits the chart to the selected number of entries', async () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, index) =>
      driver(id, `Pilota ${id.toUpperCase()}`, String(50 - index)),
    )
    vi.mocked(getDriverStandings).mockResolvedValue(many)
    vi.mocked(getDriverStandingsAfterRound).mockResolvedValue(many)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    const legend = await screen.findByRole('list', { name: 'Legenda' })
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5)

    await user.selectOptions(screen.getByLabelText('Mostra i primi'), '3')
    expect(within(screen.getByRole('list', { name: 'Legenda' })).getAllByRole('listitem')).toHaveLength(3)

    await user.selectOptions(screen.getByLabelText('Mostra i primi'), '8')
    expect(within(screen.getByRole('list', { name: 'Legenda' })).getAllByRole('listitem')).toHaveLength(7)
    // The table always lists everybody.
    expect(screen.getAllByRole('row')).toHaveLength(8)
  })

  it('switches to constructors and updates the URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()
    await screen.findByText('Nome Norris')

    await user.click(screen.getByRole('tab', { name: 'Costruttori' }))

    const panel = screen.getByRole('tabpanel', { name: 'Costruttori' })
    expect(await within(panel).findByRole('cell', { name: 'McLaren' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/classifiche?tipo=costruttori')
    expect(await screen.findByRole('list', { name: 'Legenda' })).toHaveTextContent('McLaren')
    expect(getConstructorStandingsAfterRound).toHaveBeenCalledTimes(2)
  })

  it('shows a historic season with a disqualified driver', async () => {
    renderPage('/classifiche?stagione=1997')

    const row = (await screen.findByText('Nome Schumacher')).closest('tr') as HTMLElement
    expect(within(row).getByText('SQ')).toBeInTheDocument()
    expect(screen.getByText('SQ = squalificato dal campionato.')).toBeInTheDocument()
    expect(getDriverStandings).toHaveBeenCalledWith(1997)
  })

  it('changes season from the selector and keeps the tab', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('/classifiche?tipo=costruttori')
    await screen.findByRole('cell', { name: 'McLaren' })

    await user.selectOptions(screen.getByLabelText('Stagione'), '1988')

    expect(screen.getByTestId('location')).toHaveTextContent('/classifiche?stagione=1988&tipo=costruttori')
    expect(getConstructorStandings).toHaveBeenCalledWith(1988)
  })

  it('explains that constructor standings start in 1958, without API calls', () => {
    renderPage('/classifiche?stagione=1957&tipo=costruttori')

    expect(screen.getByText('La classifica costruttori esiste solo dal 1958.')).toBeInTheDocument()
    expect(getConstructorStandings).not.toHaveBeenCalled()
    expect(getConstructorStandingsAfterRound).not.toHaveBeenCalled()
  })

  it('handles a season without standings yet', async () => {
    vi.mocked(getDriverStandings).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Classifica della stagione 2026 non ancora disponibile.')).toBeInTheDocument()
    expect(getSchedule).not.toHaveBeenCalled()
  })

  it('shows a specific message when rate limited', async () => {
    vi.mocked(getDriverStandings).mockRejectedValue(
      new ApiError('limit', { rateLimited: true, retryAfterMs: 5 * 60_000 }),
    )
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/Riprova tra circa 5 minuti/)
  })

  it('keeps the table when only the chart fails', async () => {
    vi.mocked(getDriverStandingsAfterRound).mockRejectedValue(new ApiError('boom', { status: 500 }))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossibile caricare i dati/)
    expect(screen.getByText('Nome Norris')).toBeInTheDocument()
  })
})
