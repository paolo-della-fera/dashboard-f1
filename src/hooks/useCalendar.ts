import { useQuery } from '@tanstack/react-query'
import { getSchedule } from '../api/index.ts'
import { seasonStaleTime } from './queryClient.ts'

/** Races of a season (numeric year, so the current season has a single cache key). */
export function useCalendar(season: number) {
  return useQuery({
    queryKey: ['schedule', season],
    queryFn: () => getSchedule(season),
    staleTime: seasonStaleTime(season, new Date().getFullYear()),
  })
}
