import type { Driver } from '../types/jolpica.ts'
import { type DriverStats, FIRST_FASTEST_LAP_SEASON, type SeasonStats } from './headToHead.ts'

export type Side = 'a' | 'b'

export interface Matchup {
  a: { driverId: string; name: string }
  b: { driverId: string; name: string }
}

/** Shortcuts shown when no driver is selected yet. */
export const FAMOUS_MATCHUPS: Matchup[] = [
  { a: { driverId: 'senna', name: 'Senna' }, b: { driverId: 'prost', name: 'Prost' } },
  { a: { driverId: 'hamilton', name: 'Hamilton' }, b: { driverId: 'max_verstappen', name: 'Verstappen' } },
  { a: { driverId: 'michael_schumacher', name: 'Schumacher' }, b: { driverId: 'hakkinen', name: 'Häkkinen' } },
  { a: { driverId: 'fangio', name: 'Fangio' }, b: { driverId: 'michael_schumacher', name: 'Schumacher' } },
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function driverLabel(driver: Pick<Driver, 'givenName' | 'familyName'>): string {
  return `${driver.givenName} ${driver.familyName}`
}

/** Birth year, to tell apart drivers with the same name (e.g. the Villeneuves). */
export function driverDetails(driver: Driver): string | null {
  const year = driver.dateOfBirth?.slice(0, 4)
  return year ? `n. ${year}` : null
}

function searchRank(driver: Driver, query: string, firstWord: string): number {
  const family = normalize(driver.familyName)
  if (family.startsWith(query)) return 0
  if (family.startsWith(firstWord)) return 1
  if (normalize(driverLabel(driver)).startsWith(query)) return 2
  return 3
}

/**
 * Drivers whose name contains every word of the query, ignoring case and
 * accents (Räikkönen, Pérez); surnames starting with the query come first.
 */
export function searchDrivers(drivers: Driver[], query: string, limit = 10): Driver[] {
  const normalized = normalize(query)
  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return drivers
    .filter((driver) => {
      const name = normalize(driverLabel(driver))
      return words.every((word) => name.includes(word))
    })
    .map((driver) => ({ driver, rank: searchRank(driver, normalized, words[0]) }))
    .sort(
      (x, y) =>
        x.rank - y.rank ||
        x.driver.familyName.localeCompare(y.driver.familyName) ||
        x.driver.givenName.localeCompare(y.driver.givenName),
    )
    .slice(0, limit)
    .map((entry) => entry.driver)
}

/** Which driver is ahead on a statistic; null on a tie or when a value is missing. */
export function leader(a: number | null, b: number | null, better: 'higher' | 'lower' = 'higher'): Side | null {
  if (a === null || b === null || a === b) return null
  const aBetter = better === 'higher' ? a > b : a < b
  return aBetter ? 'a' : 'b'
}

export interface StatLeaders {
  wins: Side | null
  podiums: Side | null
  poles: Side | null
  titles: Side | null
  fastestLaps: Side | null
  winRate: Side | null
  podiumRate: Side | null
  poleRate: Side | null
  bestChampionshipPosition: Side | null
}

function completeFastestLaps(stats: DriverStats): number | null {
  return stats.fastestLaps && !stats.fastestLaps.partial ? stats.fastestLaps.count : null
}

/**
 * Leader of each comparable statistic. Fastest laps only when both careers are
 * fully covered by the data (from 2004); starts, retirements and seasons have no "better".
 */
export function statLeaders(a: DriverStats, b: DriverStats): StatLeaders {
  return {
    wins: leader(a.wins, b.wins),
    podiums: leader(a.podiums, b.podiums),
    poles: leader(a.poles, b.poles),
    titles: leader(a.titles.length, b.titles.length),
    fastestLaps: leader(completeFastestLaps(a), completeFastestLaps(b)),
    winRate: leader(a.winRate, b.winRate),
    podiumRate: leader(a.podiumRate, b.podiumRate),
    poleRate: leader(a.poleRate, b.poleRate),
    bestChampionshipPosition: leader(
      a.bestChampionshipPosition?.position ?? null,
      b.bestChampionshipPosition?.position ?? null,
      'lower',
    ),
  }
}

export interface FastestLapDisplay {
  value: string
  note: string | null
}

export function fastestLapDisplay(stats: DriverStats): FastestLapDisplay {
  const laps = stats.fastestLaps
  const note = `dati disponibili dal ${FIRST_FASTEST_LAP_SEASON}`
  if (!laps) return { value: 'n.d.', note }
  if (laps.partial) return { value: String(laps.count), note: `${note} (${laps.coveredStarts} gare su ${stats.starts})` }
  return { value: String(laps.count), note: null }
}

const percent = new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** "24,5%", or "—" without races. */
export function formatRate(rate: number | null): string {
  return rate === null ? '—' : percent.format(rate)
}

/** Seasons as compact ranges: [1988, 1990, 1991] → "1988, 1990–1991". */
export function formatSeasons(seasons: number[]): string {
  const sorted = [...new Set(seasons)].sort((x, y) => x - y)
  const ranges: string[] = []
  let start = sorted[0]
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    if (sorted[i + 1] === current + 1) continue
    ranges.push(start === current ? String(start) : `${start}–${current}`)
    start = sorted[i + 1]
  }
  return ranges.join(', ')
}

export interface BarRow {
  label: string
  a: number | null
  b: number | null
}

export function countBars(a: DriverStats, b: DriverStats): BarRow[] {
  return [
    { label: 'Vittorie', a: a.wins, b: b.wins },
    { label: 'Podi', a: a.podiums, b: b.podiums },
    { label: 'Pole', a: a.poles, b: b.poles },
    { label: 'Titoli', a: a.titles.length, b: b.titles.length },
  ]
}

function asPercent(rate: number | null): number | null {
  return rate === null ? null : rate * 100
}

/** Per-race rates as percentages (0–100). */
export function rateBars(a: DriverStats, b: DriverStats): BarRow[] {
  return [
    { label: 'Vittorie %', a: asPercent(a.winRate), b: asPercent(b.winRate) },
    { label: 'Podi %', a: asPercent(a.podiumRate), b: asPercent(b.podiumRate) },
    { label: 'Pole %', a: asPercent(a.poleRate), b: asPercent(b.poleRate) },
  ]
}

export interface CareerSeasonPoint {
  season: number
  /** Numeric championship position; null for SQ, NC or no standing. */
  position: number | null
  label: string
  provisional: boolean
}

export interface CareerPositionRow {
  year: number
  a: number | null
  b: number | null
  seasonA: CareerSeasonPoint | null
  seasonB: CareerSeasonPoint | null
}

function careerPoints(seasons: SeasonStats[]): Map<number, CareerSeasonPoint> {
  if (seasons.length === 0) return new Map()
  const first = seasons[0].season
  return new Map(
    seasons.map((season) => [
      season.season - first + 1,
      {
        season: season.season,
        position: /^\d+$/.test(season.position) ? Number(season.position) : null,
        label: season.position,
        provisional: season.provisional,
      },
    ]),
  )
}

/**
 * Championship position by year of career (year 1 = first season), so careers
 * of different eras line up. Breaks in a career stay as gaps.
 */
export function careerPositionRows(a: SeasonStats[], b: SeasonStats[]): CareerPositionRow[] {
  const aPoints = careerPoints(a)
  const bPoints = careerPoints(b)
  const years = Math.max(0, ...aPoints.keys(), ...bPoints.keys())
  return Array.from({ length: years }, (_, index) => {
    const year = index + 1
    const seasonA = aPoints.get(year) ?? null
    const seasonB = bPoints.get(year) ?? null
    return { year, a: seasonA?.position ?? null, b: seasonB?.position ?? null, seasonA, seasonB }
  })
}

/** Surname for charts and legends; the full name when both share it (Michael and Ralf Schumacher). */
export function shortName(driver: Pick<Driver, 'givenName' | 'familyName'>, other: Pick<Driver, 'familyName'> | null): string {
  return other && normalize(other.familyName) === normalize(driver.familyName) ? driverLabel(driver) : driver.familyName
}
