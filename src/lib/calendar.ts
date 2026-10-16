import type { Race } from '../types/jolpica.ts'

export const FIRST_SEASON = 1950
/** Indicative race duration: a race is "live" for this long after its start. */
export const RACE_DURATION_MS = 3 * 60 * 60 * 1000

export type RaceStatus = 'past' | 'live' | 'upcoming'

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Race start in UTC; races without a time (older seasons) start at midnight UTC. */
export function raceStart(race: Race): Date {
  const time = race.time ?? '00:00:00Z'
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(time) ? time : `${time}Z`
  return new Date(`${race.date}T${withZone}`)
}

export function raceStatus(race: Race, now: number): RaceStatus {
  const start = raceStart(race).getTime()
  if (now < start) return 'upcoming'
  if (now < start + RACE_DURATION_MS) return 'live'
  return 'past'
}

/** The first race not yet concluded (a live race included), or null when the season is over. */
export function findNextRace(races: Race[], now: number): Race | null {
  return races.find((race) => raceStatus(race, now) !== 'past') ?? null
}

export function countdownParts(target: number, now: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000))
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

/** Selectable seasons, most recent first. */
export function seasonOptions(currentYear: number): number[] {
  const years: number[] = []
  for (let year = currentYear; year >= FIRST_SEASON; year--) years.push(year)
  return years
}

/** A valid season from a URL parameter, otherwise the current year. */
export function parseSeason(param: string | null, currentYear: number): number {
  if (param === null || !/^\d{4}$/.test(param)) return currentYear
  const year = Number(param)
  return year >= FIRST_SEASON && year <= currentYear ? year : currentYear
}

/** Race date in Italian, with the local start time when the API provides it. */
export function formatRaceDate(race: Race, timeZone?: string): string {
  if (!race.time) {
    // Date-only values are formatted in UTC so the day never shifts.
    return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeZone: 'UTC' }).format(
      raceStart(race),
    )
  }
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
    raceStart(race),
  )
}
