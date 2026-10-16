import type {
  ConstructorStanding,
  Driver,
  DriverStanding,
  MRData,
  Race,
  Season,
  StandingsList,
} from '../types/jolpica.ts'
import { TTL_DRIVER, ttlFor } from './cache.ts'
import { createJolpicaClient, type JolpicaClient } from './client.ts'
import { mergeRaces, mergeStandingsLists } from './paginate.ts'
import type { ProgressTracker } from './progress.ts'

export { ApiError, isRateLimitError } from './errors.ts'
export { createProgressTracker, type Progress, type ProgressTracker } from './progress.ts'

const races = (data: MRData) => data.RaceTable?.Races ?? []
const standingsLists = (data: MRData) => data.StandingsTable?.StandingsLists ?? []
const drivers = (data: MRData) => data.DriverTable?.Drivers ?? []
const seasons = (data: MRData) => (data.SeasonTable?.Seasons ?? []).map((entry) => entry.season)

export function createJolpicaApi(client: JolpicaClient) {
  function seasonTtl(season: Season) {
    return (data: unknown) => {
      const isEmpty = data === null || (Array.isArray(data) && data.length === 0)
      return ttlFor(season, client.currentYear(), isEmpty)
    }
  }
  const driverTtl = () => TTL_DRIVER

  function seasonRaces(season: Season, path: string): Promise<Race[]> {
    return client.cached(path, seasonTtl(season), () => client.fetchAll(path, races, mergeRaces))
  }

  function singleRace(season: Season, path: string): Promise<Race | null> {
    return client.cached(path, seasonTtl(season), async () => {
      const found = await client.fetchAll(path, races, mergeRaces)
      return found[0] ?? null
    })
  }

  function latestDriverStandings(season: Season, path: string, progress?: ProgressTracker): Promise<DriverStanding[]> {
    return client.cached(path, seasonTtl(season), async () => {
      const lists = await client.fetchAll(path, standingsLists, mergeStandingsLists, progress)
      return lists.at(-1)?.DriverStandings ?? []
    })
  }

  function latestConstructorStandings(season: Season, path: string): Promise<ConstructorStanding[]> {
    return client.cached(path, seasonTtl(season), async () => {
      const lists = await client.fetchAll(path, standingsLists, mergeStandingsLists)
      return lists.at(-1)?.ConstructorStandings ?? []
    })
  }

  function driverPath(driverId: string, resource: string): string {
    return `drivers/${encodeURIComponent(driverId)}/${resource}/`
  }

  return {
    /** Races of a season, with session dates. */
    getSchedule(season: Season): Promise<Race[]> {
      return seasonRaces(season, `${season}/races/`)
    },

    /** Latest driver standings of a season. */
    getDriverStandings(season: Season): Promise<DriverStanding[]> {
      return latestDriverStandings(season, `${season}/driverStandings/`)
    },

    /** Latest constructor standings of a season (they exist only from 1958). */
    getConstructorStandings(season: Season): Promise<ConstructorStanding[]> {
      return latestConstructorStandings(season, `${season}/constructorStandings/`)
    },

    /** Official driver standings right after a round (empty when not available yet). */
    getDriverStandingsAfterRound(season: Season, round: number): Promise<DriverStanding[]> {
      return latestDriverStandings(season, `${season}/${round}/driverStandings/`)
    },

    /** Official constructor standings right after a round (empty when not available yet). */
    getConstructorStandingsAfterRound(season: Season, round: number): Promise<ConstructorStanding[]> {
      return latestConstructorStandings(season, `${season}/${round}/constructorStandings/`)
    },

    /** The race with its `Results`, or null when not available yet. */
    getRaceResults(season: Season, round: number): Promise<Race | null> {
      return singleRace(season, `${season}/${round}/results/`)
    },

    /** The race with its `QualifyingResults`, or null when missing. */
    getQualifying(season: Season, round: number): Promise<Race | null> {
      return singleRace(season, `${season}/${round}/qualifying/`)
    },

    /** The race with its `SprintResults`, or null when there was no sprint. */
    getSprint(season: Season, round: number): Promise<Race | null> {
      return singleRace(season, `${season}/${round}/sprint/`)
    },

    /** All races of a season, each with its `Results`. */
    getSeasonResults(season: Season): Promise<Race[]> {
      return seasonRaces(season, `${season}/results/`)
    },

    /** Every driver in F1 history. */
    getAllDrivers(): Promise<Driver[]> {
      const path = 'drivers/'
      return client.cached(path, driverTtl, () => client.fetchAll(path, drivers))
    },

    /** Every race of a driver's career, each with the driver's result. */
    getDriverResults(driverId: string, progress?: ProgressTracker): Promise<Race[]> {
      const path = driverPath(driverId, 'results')
      return client.cached(path, driverTtl, () => client.fetchAll(path, races, mergeRaces, progress))
    },

    /** Every qualifying of a driver's career. */
    getDriverQualifying(driverId: string, progress?: ProgressTracker): Promise<Race[]> {
      const path = driverPath(driverId, 'qualifying')
      return client.cached(path, driverTtl, () => client.fetchAll(path, races, mergeRaces, progress))
    },

    /**
     * Championship standing of the driver for each season raced (final, or
     * latest for the current season). Jolpica needs a season for driver
     * standings, so this fetches the driver's seasons and then the full
     * standings of each season (the same entry as `getDriverStandings`), keeping
     * the driver's row: seasons are shared between drivers and with the
     * standings page. Concluded seasons are cached forever. Network requests
     * are reported to `progress`, cache hits are not.
     */
    async getDriverSeasonStandings(driverId: string, progress?: ProgressTracker): Promise<StandingsList[]> {
      const seasonsPath = driverPath(driverId, 'seasons')
      const driverSeasons = await client.cached(seasonsPath, driverTtl, () =>
        client.fetchAll(seasonsPath, seasons, undefined, progress),
      )
      const perSeason = await Promise.all(
        driverSeasons.map(async (year): Promise<StandingsList | null> => {
          const season = Number(year)
          const standings = await latestDriverStandings(season, `${season}/driverStandings/`, progress)
          const standing = standings.find((entry) => entry.Driver.driverId === driverId)
          // The season standings cache keeps only the rows, not the round they refer to.
          return standing ? { season: year, round: '', DriverStandings: [standing] } : null
        }),
      )
      return perSeason.filter((list): list is StandingsList => list !== null)
    },
  }
}

export type JolpicaApi = ReturnType<typeof createJolpicaApi>

const api = createJolpicaApi(createJolpicaClient())

export const {
  getSchedule,
  getDriverStandings,
  getConstructorStandings,
  getDriverStandingsAfterRound,
  getConstructorStandingsAfterRound,
  getRaceResults,
  getQualifying,
  getSprint,
  getSeasonResults,
  getAllDrivers,
  getDriverResults,
  getDriverQualifying,
  getDriverSeasonStandings,
} = api
