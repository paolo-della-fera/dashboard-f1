import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getQualifying, getRaceResults, getSchedule, getSprint } from '../../api/index.ts'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import { createQueryClient } from '../../hooks/queryClient.ts'
import type { QualifyingResult, Race, Result } from '../../types/jolpica.ts'
import LatestResultsRedirect from '../LatestResultsRedirect.tsx'
import ResultsPage from '../ResultsPage.tsx'

vi.mock('../../api/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/index.ts')>()
  return {
    ...original,
    getSchedule: vi.fn(),
    getRaceResults: vi.fn(),
    getQualifying: vi.fn(),
    getSprint: vi.fn(),
  }
})

// 20 March 2026: rounds 1 and 2 are over, round 3 is still to come.
const NOW = Date.UTC(2026, 2, 20, 12)

const schedule2026 = [
  makeRace(2026, 1, { raceName: "Gran Premio d'Australia", date: '2026-03-08', time: '04:00:00Z' }),
  makeRace(2026, 2, {
    raceName: 'Gran Premio di Cina',
    date: '2026-03-15',
    time: '07:00:00Z',
    Sprint: { date: '2026-03-14', time: '03:00:00Z' },
  }),
  makeRace(2026, 3, { raceName: 'Gran Premio del Giappone', date: '2026-03-29', time: '05:00:00Z' }),
]

const schedule1950 = [makeRace(1950, 1, { raceName: 'Gran Premio di Gran Bretagna', date: '1950-05-13' })]

function result(familyName: string, extra: Partial<Result> = {}): Result {
  return {
    position: '1',
    positionText: '1',
    points: '25',
    grid: '1',
    laps: '58',
    status: 'Finished',
    Driver: { driverId: familyName.toLowerCase(), givenName: 'Nome', familyName },
    Constructor: { constructorId: 'mclaren', name: 'McLaren' },
    ...extra,
  }
}

const raceResults: Result[] = [
  result('Norris', {
    grid: '3',
    Time: { time: '1:26:07.469' },
    FastestLap: { rank: '1', Time: { time: '1:26.765' } },
  }),
  result('Piastri', {
    position: '2',
    positionText: '2',
    points: '18',
    grid: '1',
    Time: { time: '+12.594' },
    FastestLap: { rank: '2', Time: { time: '1:27.001' } },
  }),
  result('Hulkenberg', {
    position: '3',
    positionText: 'R',
    points: '0',
    grid: '5',
    laps: '12',
    status: 'Engine',
    Constructor: { constructorId: 'sauber', name: 'Sauber' },
  }),
]

// 1950s: no fastest laps, no times for retirements, shared drives listed twice.
const results1950: Result[] = [
  result('Farina', { points: '9', laps: '70', grid: undefined, Time: { time: '2:13:23.600' } }),
  result('Parnell', { position: '2', positionText: '2', points: '0', laps: '70', grid: undefined }),
  result('Fry', { position: '3', positionText: 'R', points: '0', laps: '5', status: 'Gearbox', grid: '10' }),
  result('Fry', { position: '3', positionText: 'R', points: '0', laps: '5', status: 'Gearbox', grid: '10' }),
]

const qualifyingResults: QualifyingResult[] = [
  {
    position: '1',
    Driver: { driverId: 'piastri', givenName: 'Nome', familyName: 'Piastri' },
    Constructor: { constructorId: 'mclaren', name: 'McLaren' },
    Q1: '1:30.100',
    Q2: '1:29.500',
    Q3: '1:29.000',
  },
]

function raceWith(race: Race, extra: Partial<Race>): Race {
  return { ...race, ...extra }
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderPage(path: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="risultati" element={<LatestResultsRedirect />} />
          <Route path="risultati/:season/:round" element={<ResultsPage />} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    vi.mocked(getSchedule)
      .mockReset()
      .mockImplementation(async (season) => (season === 1950 ? schedule1950 : season === 2026 ? schedule2026 : []))
    vi.mocked(getRaceResults)
      .mockReset()
      .mockImplementation(async (season, round) =>
        season === 1950
          ? raceWith(schedule1950[0], { Results: results1950 })
          : raceWith(schedule2026[round - 1], { Results: raceResults }),
      )
    vi.mocked(getQualifying)
      .mockReset()
      .mockImplementation(async (_season, round) =>
        raceWith(schedule2026[round - 1], { QualifyingResults: qualifyingResults }),
      )
    vi.mocked(getSprint)
      .mockReset()
      .mockImplementation(async (_season, round) =>
        raceWith(schedule2026[round - 1], { SprintResults: [result('Russell', { points: '8' })] }),
      )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows loading, then the race classification with every column', async () => {
    renderPage('/risultati/2026/1')

    expect(screen.getByText('Caricamento del Gran Premio…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: "Gran Premio d'Australia" })).toBeInTheDocument()

    const norris = (await screen.findByText('Nome Norris')).closest('tr') as HTMLElement
    expect(within(norris).getByText('1:26:07.469')).toBeInTheDocument()
    expect(within(norris).getByLabelText('Guadagnate 2 posizioni')).toBeInTheDocument()
    expect(within(norris).getByText(/giro più veloce/)).toBeInTheDocument()
    expect(within(norris).getByText('25')).toBeInTheDocument()

    const piastri = screen.getByText('Nome Piastri').closest('tr') as HTMLElement
    expect(within(piastri).getByLabelText('Persa 1 posizione')).toBeInTheDocument()

    const hulkenberg = screen.getByText('Nome Hulkenberg').closest('tr') as HTMLElement
    expect(within(hulkenberg).getByText('Rit.')).toBeInTheDocument()
    expect(within(hulkenberg).getByText('Motore')).toBeInTheDocument()
    expect(screen.getByText('Rit. = ritirato')).toBeInTheDocument()

    expect(getRaceResults).toHaveBeenCalledWith(2026, 1)
    expect(getQualifying).not.toHaveBeenCalled()
    expect(getSprint).not.toHaveBeenCalled()
  })

  it('loads the qualifying only when its tab is opened', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('/risultati/2026/1')
    await screen.findByText('Nome Norris')

    await user.click(screen.getByRole('tab', { name: 'Qualifiche' }))

    const panel = screen.getByRole('tabpanel', { name: 'Qualifiche' })
    expect(await within(panel).findByText('1:29.000')).toBeInTheDocument()
    expect(within(panel).getByRole('columnheader', { name: 'Q3' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/risultati/2026/1?sessione=qualifiche')
    expect(getQualifying).toHaveBeenCalledWith(2026, 1)
  })

  it('offers the sprint tab only for sprint weekends', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('/risultati/2026/1')
    await screen.findByText('Nome Norris')
    expect(screen.queryByRole('tab', { name: 'Sprint' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /GP successivo/ }))
    await user.click(await screen.findByRole('tab', { name: 'Sprint' }))

    expect(await screen.findByText('Nome Russell')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/risultati/2026/2?sessione=sprint')
    expect(getSprint).toHaveBeenCalledWith(2026, 2)
  })

  it('links to the previous race and to the next one only when already run', async () => {
    renderPage('/risultati/2026/2')
    await screen.findByText('Nome Norris')

    const nav = screen.getByRole('navigation', { name: 'Gran Premi vicini' })
    expect(within(nav).getByRole('link', { name: /GP precedente/ })).toHaveAttribute('href', '/risultati/2026/1')
    expect(within(nav).queryByRole('link', { name: /GP successivo/ })).not.toBeInTheDocument()
  })

  it('keeps the session when moving to another race', async () => {
    renderPage('/risultati/2026/2?sessione=qualifiche')
    await screen.findByText('1:29.000')

    expect(screen.getByRole('link', { name: /GP precedente/ })).toHaveAttribute(
      'href',
      '/risultati/2026/1?sessione=qualifiche',
    )
  })

  it('picks another Grand Prix or season from the selectors', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage('/risultati/2026/2')
    await screen.findByText('Nome Norris')

    const picker = screen.getByLabelText('Gran Premio')
    expect(within(picker).getAllByRole('option')).toHaveLength(2)
    await user.selectOptions(picker, '1')
    expect(screen.getByTestId('location')).toHaveTextContent('/risultati/2026/1')

    await user.selectOptions(screen.getByLabelText('Stagione'), '1950')
    expect(await screen.findByTestId('location')).toHaveTextContent('/risultati/1950/1')
  })

  it('shows a 1950s race with partial data without errors', async () => {
    renderPage('/risultati/1950/1')

    const fry = await screen.findAllByText('Nome Fry')
    expect(fry).toHaveLength(2)
    expect(screen.queryByRole('columnheader', { name: 'Giro veloce' })).not.toBeInTheDocument()
    const parnell = screen.getByText('Nome Parnell').closest('tr') as HTMLElement
    expect(within(parnell).getByText('Arrivato')).toBeInTheDocument()
    expect(within(fry[0].closest('tr') as HTMLElement).getByText('Cambio')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Sprint' })).not.toBeInTheDocument()
  })

  it('explains when the qualifying is missing', async () => {
    vi.mocked(getQualifying).mockResolvedValue(null)
    renderPage('/risultati/1950/1?sessione=qualifiche')

    expect(await screen.findByText(/Qualifiche non disponibili per questo Gran Premio/)).toBeInTheDocument()
  })

  it('handles results not published yet', async () => {
    vi.mocked(getRaceResults).mockResolvedValue(null)
    renderPage('/risultati/2026/2')

    expect(await screen.findByText('Risultati della gara non ancora disponibili.')).toBeInTheDocument()
  })

  it('does not load results of a race still to come', async () => {
    renderPage('/risultati/2026/3')

    expect(await screen.findByText('Questo Gran Premio non si è ancora disputato.')).toBeInTheDocument()
    expect(getRaceResults).not.toHaveBeenCalled()
  })

  it('reports invalid routes without API calls', () => {
    renderPage('/risultati/abc/1')

    expect(screen.getByText(/Gran Premio non trovato/)).toBeInTheDocument()
    expect(getSchedule).not.toHaveBeenCalled()
    expect(getRaceResults).not.toHaveBeenCalled()
  })

  it('reports rounds missing from the calendar', async () => {
    renderPage('/risultati/2026/30')

    expect(await screen.findByText(/Gran Premio non trovato/)).toBeInTheDocument()
    expect(getRaceResults).not.toHaveBeenCalled()
  })

  it('shows an error when the results fail', async () => {
    vi.mocked(getRaceResults).mockRejectedValue(new ApiError('boom', { status: 500 }))
    renderPage('/risultati/2026/1')

    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossibile caricare i dati/)
    expect(screen.getByRole('heading', { level: 2, name: "Gran Premio d'Australia" })).toBeInTheDocument()
  })
})

describe('LatestResultsRedirect', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    vi.mocked(getSchedule).mockReset()
    vi.mocked(getRaceResults).mockReset().mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the last race run in the current season', async () => {
    vi.mocked(getSchedule).mockResolvedValue(schedule2026)
    renderPage('/risultati')

    expect(screen.getByText("Caricamento dell'ultimo Gran Premio…")).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Gran Premio di Cina' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/risultati/2026/2')
  })

  it('falls back to the previous season before the first race', async () => {
    vi.setSystemTime(Date.UTC(2026, 0, 10))
    const schedule2025 = [makeRace(2025, 1), makeRace(2025, 24, { raceName: 'Gran Premio di Abu Dhabi' })]
    vi.mocked(getSchedule).mockImplementation(async (season) => (season === 2025 ? schedule2025 : schedule2026))
    renderPage('/risultati')

    expect(await screen.findByRole('heading', { level: 2, name: 'Gran Premio di Abu Dhabi' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/risultati/2025/24')
  })

  it('shows an error when the calendar fails', async () => {
    vi.mocked(getSchedule).mockRejectedValue(new ApiError('boom', { status: 500 }))
    renderPage('/risultati')

    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossibile caricare i dati/)
  })
})
