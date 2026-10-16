import type { ConstructorStanding, DriverStanding, Race } from '../types/jolpica.ts'
import { raceStatus } from './calendar.ts'

/** Constructor standings were introduced in 1958. */
export const FIRST_CONSTRUCTORS_SEASON = 1958
// At most 8 lines: one per categorical colour of the chart palette.
export const TOP_N_OPTIONS = [3, 5, 8] as const
export const DEFAULT_TOP_N = 5

export type StandingsKind = 'drivers' | 'constructors'
export type Standing = DriverStanding | ConstructorStanding

/** Official standings right after one round. */
export interface RoundStandings {
  round: number
  standings: Standing[]
}

export interface ChartSeries {
  id: string
  name: string
}

/** One point on the x axis: cumulative points of each series after a round. */
export interface ProgressionRow {
  round: number
  label: string
  raceName: string
  points: Record<string, number>
}

export function isDriverStanding(standing: Standing): standing is DriverStanding {
  return 'Driver' in standing
}

export function standingId(standing: Standing): string {
  return isDriverStanding(standing) ? standing.Driver.driverId : standing.Constructor.constructorId
}

export function standingName(standing: Standing): string {
  return isDriverStanding(standing)
    ? `${standing.Driver.givenName} ${standing.Driver.familyName}`
    : standing.Constructor.name
}

/** Points as a number; 1950s seasons have fractions (shared drives), missing values count as 0. */
export function parsePoints(text: string | undefined): number {
  const value = Number(text)
  return Number.isFinite(value) ? value : 0
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(points)
}

/**
 * Championship position to show: "SQ" when excluded (Schumacher 1997), "NC"
 * when listed without a position (positionText "-", e.g. Senna 1994), "—" when
 * there is no standing or no position at all.
 */
export function positionLabel(standing: Standing | null | undefined): string {
  if (!standing) return '—'
  if (standing.positionText === 'D') return 'SQ'
  if (/^\d+$/.test(standing.positionText)) return standing.position ?? standing.positionText
  if (!standing.positionText && !standing.position) return '—'
  return 'NC'
}

export function driverTeams(standing: DriverStanding): string {
  return standing.Constructors.map((constructor) => constructor.name).join(' / ')
}

export function hasConstructorStandings(season: number): boolean {
  return season >= FIRST_CONSTRUCTORS_SEASON
}

/** Kind from the `tipo` URL parameter: drivers unless "costruttori". */
export function parseKind(param: string | null): StandingsKind {
  return param === 'costruttori' ? 'constructors' : 'drivers'
}

/** Rounds already raced, in calendar order. */
export function completedRounds(races: Race[], now: number): number[] {
  return races.filter((race) => raceStatus(race, now) === 'past').map((race) => Number(race.round))
}

/** The first `n` entries of a standings list (already sorted by the API). */
export function topSeries(standings: Standing[], n: number): ChartSeries[] {
  return standings.slice(0, n).map((standing) => ({ id: standingId(standing), name: standingName(standing) }))
}

/**
 * Rows for the points chart: one per round, with the official points of each
 * requested series after that round. A series missing from a round (not yet
 * entered, or joined mid-season) keeps its previous value, or 0 before its
 * first appearance.
 */
export function buildPointsProgression(
  history: RoundStandings[],
  races: Race[],
  ids: string[],
): ProgressionRow[] {
  const raceNames = new Map(races.map((race) => [Number(race.round), race.raceName]))
  const last = new Map<string, number>(ids.map((id) => [id, 0]))
  return [...history]
    .sort((a, b) => a.round - b.round)
    .map(({ round, standings }) => {
      const byId = new Map(standings.map((standing) => [standingId(standing), standing]))
      const points: Record<string, number> = {}
      for (const id of ids) {
        const standing = byId.get(id)
        const value = standing ? parsePoints(standing.points) : (last.get(id) ?? 0)
        last.set(id, value)
        points[id] = value
      }
      return { round, label: `R${round}`, raceName: raceNames.get(round) ?? `Round ${round}`, points }
    })
}
