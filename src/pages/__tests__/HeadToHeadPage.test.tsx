import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  getAllDrivers,
  getDriverQualifying,
  getDriverResults,
  getDriverSeasonStandings,
  getSchedule,
} from '../../api/index.ts'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import { createQueryClient } from '../../hooks/queryClient.ts'
import type { Driver, Race, Result, StandingsList } from '../../types/jolpica.ts'
import HeadToHeadPage from '../HeadToHeadPage.tsx'

vi.mock('../../api/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/index.ts')>()
  return {
    ...original,
    getSchedule: vi.fn(),
    getAllDrivers: vi.fn(),
    getDriverResults: vi.fn(),
    getDriverQualifying: vi.fn(),
    getDriverSeasonStandings: vi.fn(),
  }
})

// 20 March 2026: the 2026 season is under way, so the last concluded one is 2025.
const NOW = Date.UTC(2026, 2, 20, 12)

const senna: Driver = { driverId: 'senna', givenName: 'Ayrton', familyName: 'Senna', dateOfBirth: '1960-03-21' }
const prost: Driver = { driverId: 'prost', givenName: 'Alain', familyName: 'Prost', dateOfBirth: '1955-02-24' }
const fangio: Driver = { driverId: 'fangio', givenName: 'Juan Manuel', familyName: 'Fangio', dateOfBirth: '1911-06-24' }
const mclaren = { constructorId: 'mclaren', name: 'McLaren' }

function result(driver: Driver, position: number, grid: number, constructor = mclaren): Result {
  return {
    position: String(position),
    positionText: String(position),
    points: '0',
    grid: String(grid),
    Driver: driver,
    Constructor: constructor,
  }
}

function standing(driver: Driver, season: number, position: number): StandingsList {
  return {
    season: String(season),
    round: '16',
    DriverStandings: [
      {
        position: String(position),
        positionText: String(position),
        points: position === 1 ? '90' : '87',
        wins: '0',
        Driver: driver,
        Constructors: [mclaren],
      },
    ],
  }
}

const careers: Record<string, { results: Race[]; standings: StandingsList[] }> = {
  senna: {
    results: [
      makeRace(1988, 1, { Results: [result(senna, 1, 1)] }),
      makeRace(1988, 2, { Results: [result(senna, 2, 2)] }),
    ],
    standings: [standing(senna, 1988, 1)],
  },
  prost: {
    results: [
      makeRace(1988, 1, { Results: [result(prost, 2, 2)] }),
      makeRace(1988, 2, { Results: [result(prost, 1, 1)] }),
    ],
    standings: [standing(prost, 1988, 2)],
  },
  fangio: {
    results: [makeRace(1951, 1, { Results: [result(fangio, 1, 1, { constructorId: 'alfa', name: 'Alfa Romeo' })] })],
    standings: [standing(fangio, 1951, 1)],
  },
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderPage(path = '/testa-a-testa') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="testa-a-testa" element={<HeadToHeadPage />} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HeadToHeadPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    vi.mocked(getSchedule)
      .mockReset()
      .mockResolvedValue([makeRace(2026, 1, { date: '2026-03-08' }), makeRace(2026, 2, { date: '2026-11-29' })])
    vi.mocked(getAllDrivers).mockReset().mockResolvedValue([senna, prost, fangio])
    vi.mocked(getDriverResults)
      .mockReset()
      .mockImplementation(async (id) => careers[id]?.results ?? [])
    vi.mocked(getDriverQualifying).mockReset().mockResolvedValue([])
    vi.mocked(getDriverSeasonStandings)
      .mockReset()
      .mockImplementation(async (id) => careers[id]?.standings ?? [])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('suggests famous matchups when no driver is chosen', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    const famous = screen.getByRole('region', { name: 'Confronti famosi' })
    expect(within(famous).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Senna – Prost',
      'Hamilton – Verstappen',
      'Schumacher – Häkkinen',
      'Fangio – Schumacher',
    ])

    await user.click(within(famous).getByRole('link', { name: 'Senna – Prost' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/testa-a-testa?pilota1=senna&pilota2=prost')
    expect(screen.queryByRole('region', { name: 'Confronti famosi' })).not.toBeInTheDocument()
    expect(getDriverResults).not.toHaveBeenCalledWith('hamilton', expect.anything())
  })

  it('finds a driver by name, accents and case aside, and puts it in the URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    const input = screen.getByRole('combobox', { name: 'Primo pilota' })
    await vi.waitFor(() => expect(input).toBeEnabled())
    await user.type(input, 'SENN')
    await user.click(screen.getByRole('option', { name: /Ayrton Senna/ }))

    expect(screen.getByTestId('location')).toHaveTextContent('/testa-a-testa?pilota1=senna')
    expect(input).toHaveValue('Ayrton Senna')
    expect(await screen.findByText('Scegli il secondo pilota.')).toBeInTheDocument()
  })

  it('shows the request count while a career is loading', async () => {
    vi.mocked(getDriverResults).mockImplementation((id, progress) => {
      if (id !== 'senna') return Promise.resolve(careers[id]?.results ?? [])
      progress?.expect(3)
      progress?.complete(1)
      return new Promise<Race[]>(() => {})
    })
    renderPage('/testa-a-testa?pilota1=senna&pilota2=prost')

    const status = await screen.findByText('Ayrton Senna: 1 di 3 richieste')
    const box = status.closest('[role="status"]') as HTMLElement
    expect(within(box).getByText(/il primo caricamento può richiedere qualche secondo/)).toBeInTheDocument()
    expect(within(box).getByRole('progressbar', { name: 'Avanzamento per Ayrton Senna' })).toHaveAttribute('value', '1')
    expect(getDriverResults).toHaveBeenCalledWith('senna', expect.objectContaining({ expect: expect.any(Function) }))
    // The other driver is shown as soon as it is ready.
    expect(await screen.findByRole('heading', { level: 2, name: 'Alain Prost' })).toBeInTheDocument()
  })

  it('compares two former teammates side by side', async () => {
    renderPage('/testa-a-testa?pilota1=senna&pilota2=prost')

    const sennaCard = (await screen.findByRole('heading', { level: 2, name: 'Ayrton Senna' })).closest('article') as HTMLElement
    const prostCard = screen.getByRole('heading', { level: 2, name: 'Alain Prost' }).closest('article') as HTMLElement

    // One title against none: only Senna is ahead there; wins are tied.
    const sennaTitles = within(sennaCard).getByText('Titoli mondiali').parentElement as HTMLElement
    expect(within(sennaTitles).getByText('(in vantaggio)')).toBeInTheDocument()
    expect(within(sennaTitles).getByText('1988')).toBeInTheDocument()
    expect(within(prostCard).queryByText('(in vantaggio)', { exact: false })).not.toBeInTheDocument()

    // Fastest laps before 2004 are not in the data.
    const fastest = within(sennaCard).getByText('Giri veloci').parentElement as HTMLElement
    expect(within(fastest).getByText('n.d.')).toBeInTheDocument()
    expect(within(fastest).getByText('dati disponibili dal 2004')).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 2, name: 'Vittorie, podi, pole e titoli' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Percentuali per gara' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Posizione in campionato per anno di carriera' })).toBeInTheDocument()

    const together = screen.getByRole('region', { name: 'In pista insieme' })
    expect(within(together).getByText(/2 gare disputate da entrambi/)).toBeInTheDocument()
    expect(within(together).getAllByText('2 confronti decisi sulla griglia di partenza', { exact: false })).toHaveLength(1)

    const teammates = screen.getByRole('region', { name: 'Da compagni di squadra' })
    const row = within(teammates).getByRole('cell', { name: '1988' }).closest('tr') as HTMLElement
    expect(within(row).getByText('McLaren')).toBeInTheDocument()
    expect(within(row).getByText('1 · 90 pt')).toBeInTheDocument()
    expect(within(row).getByText('2 · 87 pt')).toBeInTheDocument()

    expect(screen.getByRole('note')).toHaveTextContent('i punti non sono confrontabili tra epoche diverse')
  })

  it('says when two drivers never raced together', async () => {
    renderPage('/testa-a-testa?pilota1=fangio&pilota2=senna')

    expect(await screen.findByText('Non hanno mai corso nella stessa gara.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Da compagni di squadra' })).not.toBeInTheDocument()
  })

  it('shows an error for a driver whose career cannot be loaded', async () => {
    vi.mocked(getDriverResults).mockImplementation(async (id) => {
      if (id === 'prost') throw new ApiError('boom', { status: 500 })
      return careers[id]?.results ?? []
    })
    renderPage('/testa-a-testa?pilota1=senna&pilota2=prost')

    expect(await screen.findByRole('alert')).toHaveTextContent('Alain Prost: Impossibile caricare i dati. Riprova più tardi.')
    expect(await screen.findByRole('heading', { level: 2, name: 'Ayrton Senna' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'In pista insieme' })).not.toBeInTheDocument()
  })

  it('asks for two different drivers', async () => {
    renderPage('/testa-a-testa?pilota1=senna&pilota2=senna')

    expect(screen.getByText('Scegli due piloti diversi.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Ayrton Senna' })).not.toBeInTheDocument()
  })

  it('reports a driver missing from the drivers list instead of an empty card', async () => {
    renderPage('/testa-a-testa?pilota1=nessuno&pilota2=senna')

    expect(await screen.findByText('Pilota non trovato.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Ayrton Senna' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'nessuno' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'In pista insieme' })).not.toBeInTheDocument()
  })
})
