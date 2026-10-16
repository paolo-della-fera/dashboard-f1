import { useQuery } from '@tanstack/react-query'
import { getQualifying, getRaceResults, getSprint } from '../api/index.ts'
import type { Race } from '../types/jolpica.ts'
import { seasonStaleTime } from './queryClient.ts'

function useSession(
  key: string,
  fetcher: (season: number, round: number) => Promise<Race | null>,
  season: number,
  round: number,
  enabled: boolean,
) {
  return useQuery<Race | null>({
    queryKey: [key, season, round],
    queryFn: () => fetcher(season, round),
    staleTime: seasonStaleTime(season, new Date().getFullYear()),
    enabled,
  })
}

/** Race classification of a Grand Prix (null when not published yet). */
export function useRaceResults(season: number, round: number, enabled = true) {
  return useSession('raceResults', getRaceResults, season, round, enabled)
}

/** Qualifying of a Grand Prix (null when missing, e.g. most races before 1994). */
export function useQualifying(season: number, round: number, enabled = true) {
  return useSession('qualifying', getQualifying, season, round, enabled)
}

/** Sprint of a Grand Prix (null when there was none). */
export function useSprint(season: number, round: number, enabled = true) {
  return useSession('sprint', getSprint, season, round, enabled)
}
