import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getDriverStandings, getSchedule } from '../../api/index.ts'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import DevDataPage from '../DevDataPage.tsx'

vi.mock('../../api/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/index.ts')>()
  return { ...original, getSchedule: vi.fn(), getDriverStandings: vi.fn() }
})

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DevDataPage />
    </QueryClientProvider>,
  )
}

describe('DevDataPage', () => {
  beforeEach(() => {
    vi.mocked(getSchedule).mockReset()
    vi.mocked(getDriverStandings).mockReset()
  })

  it('shows loading, then the raw data', async () => {
    vi.mocked(getSchedule).mockResolvedValue([makeRace(2026, 1)])
    vi.mocked(getDriverStandings).mockResolvedValue([])
    renderPage()

    expect(screen.getAllByText('Caricamento…')).toHaveLength(2)
    expect(await screen.findByText(/Gran Premio 1/)).toBeInTheDocument()
    expect(await screen.findByText('[]')).toBeInTheDocument()
    expect(screen.queryByText('Caricamento…')).not.toBeInTheDocument()
  })

  it('shows a specific message when rate limited', async () => {
    vi.mocked(getSchedule).mockRejectedValue(
      new ApiError('limit', { rateLimited: true, retryAfterMs: 5 * 60_000 }),
    )
    vi.mocked(getDriverStandings).mockRejectedValue(new ApiError('boom', { status: 500 }))
    renderPage()

    expect(await screen.findByText(/Riprova tra circa 5 minuti/)).toBeInTheDocument()
    expect(await screen.findByText(/Impossibile caricare i dati/)).toBeInTheDocument()
  })
})
