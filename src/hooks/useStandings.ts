import { useQuery } from '@tanstack/react-query'
import {
  getConstructorStandings,
  getConstructorStandingsAfterRound,
  getDriverStandings,
  getDriverStandingsAfterRound,
  getSchedule,
} from '../api/index.ts'
import { completedRounds, type RoundStandings, type Standing, type StandingsKind } from '../lib/standings.ts'
import type { Race } from '../types/jolpica.ts'
import { seasonStaleTime } from './queryClient.ts'

export interface StandingsHistory {
  races: Race[]
  history: RoundStandings[]
}

/** Latest (or final) standings of a season. */
export function useStandings(season: number, kind: StandingsKind, enabled = true) {
  return useQuery<Standing[]>({
    queryKey: ['standings', season, kind],
    queryFn: () => (kind === 'drivers' ? getDriverStandings(season) : getConstructorStandings(season)),
    staleTime: seasonStaleTime(season, new Date().getFullYear()),
    enabled,
  })
}

/**
 * Official standings after each completed round, for the points chart: one
 * request per round, all going through the client queue and cache.
 */
export function useStandingsHistory(season: number, kind: StandingsKind, enabled = true) {
  return useQuery<StandingsHistory>({
    queryKey: ['standingsHistory', season, kind],
    queryFn: async () => {
      const races = await getSchedule(season)
      const rounds = completedRounds(races, Date.now())
      const afterRound = kind === 'drivers' ? getDriverStandingsAfterRound : getConstructorStandingsAfterRound
      const history = await Promise.all(
        rounds.map(async (round) => ({ round, standings: await afterRound(season, round) })),
      )
      // Standings of a just-finished race may not be published yet.
      return { races, history: history.filter((entry) => entry.standings.length > 0) }
    },
    staleTime: seasonStaleTime(season, new Date().getFullYear()),
    enabled,
  })
}
