import { useQuery } from '@tanstack/react-query'
import { getAllDrivers, getDriverQualifying, getDriverResults, getDriverSeasonStandings } from '../api/index.ts'
import type { DriverCareer } from '../lib/headToHead.ts'
import type { Driver } from '../types/jolpica.ts'
import { startCareerProgress } from './careerProgress.ts'

/** Every driver in F1 history, for the search boxes. */
export function useAllDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['allDrivers'],
    queryFn: () => getAllDrivers(),
  })
}

/**
 * Whole career of a driver (results, qualifying, season standings). The first
 * load can take a few dozen requests; progress is published per driver.
 */
export function useDriverCareer(driverId: string | null) {
  return useQuery<DriverCareer>({
    queryKey: ['driverCareer', driverId],
    queryFn: async () => {
      const id = driverId ?? ''
      const progress = startCareerProgress(id)
      const [results, qualifying, standings] = await Promise.all([
        getDriverResults(id, progress),
        getDriverQualifying(id, progress),
        getDriverSeasonStandings(id, progress),
      ])
      return { driverId: id, results, qualifying, standings }
    },
    enabled: driverId !== null,
  })
}
