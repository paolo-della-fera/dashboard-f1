import type { QualifyingResult, Race, Result } from '../types/jolpica.ts'
import { FIRST_SEASON, raceStatus } from './calendar.ts'

export type Session = 'race' | 'qualifying' | 'sprint'
export type QualifyingColumn = 'Q1' | 'Q2' | 'Q3'

export const SESSION_LABELS: Record<Session, string> = {
  race: 'Gara',
  qualifying: 'Qualifiche',
  sprint: 'Sprint',
}

// Values of the `sessione` URL parameter (the race is the default, without parameter).
const SESSION_PARAMS: Record<Session, string | null> = {
  race: null,
  qualifying: 'qualifiche',
  sprint: 'sprint',
}

export function sessionParam(session: Session): string | null {
  return SESSION_PARAMS[session]
}

export interface RaceParams {
  season: number
  round: number
}

export interface AdjacentRaces {
  previous: Race | null
  next: Race | null
}

/** Valid season and round from the route parameters, otherwise null. */
export function parseRaceParams(
  season: string | undefined,
  round: string | undefined,
  currentYear: number,
): RaceParams | null {
  if (!season || !round || !/^\d{4}$/.test(season) || !/^\d{1,2}$/.test(round)) return null
  const year = Number(season)
  const roundNumber = Number(round)
  if (year < FIRST_SEASON || year > currentYear || roundNumber < 1) return null
  return { season: year, round: roundNumber }
}

/** Session from the `sessione` URL parameter; the sprint only when the weekend has one. */
export function parseSession(param: string | null, hasSprint: boolean): Session {
  if (param === 'qualifiche') return 'qualifying'
  if (param === 'sprint' && hasSprint) return 'sprint'
  return 'race'
}

/** A classified finisher has a numeric `positionText`; letters mark retirements, disqualifications... */
export function isClassified(result: Result): boolean {
  return /^\d+$/.test(result.positionText)
}

// positionText codes of drivers without a classified position.
const POSITION_CODES: Record<string, { label: string; meaning: string }> = {
  R: { label: 'Rit.', meaning: 'ritirato' },
  D: { label: 'SQ', meaning: 'squalificato' },
  E: { label: 'Escl.', meaning: 'escluso' },
  W: { label: 'NP', meaning: 'non partito' },
  F: { label: 'NQ', meaning: 'non qualificato' },
  N: { label: 'NC', meaning: 'non classificato' },
}

export function resultPositionLabel(result: Result): string {
  if (isClassified(result)) return result.positionText
  return POSITION_CODES[result.positionText]?.label ?? (result.positionText || '—')
}

/** Legend entries ("Rit. = ritirato") for the codes used in a results table. */
export function positionLegend(results: Result[]): string[] {
  const codes = new Set(results.map((result) => result.positionText))
  return Object.entries(POSITION_CODES)
    .filter(([code]) => codes.has(code))
    .map(([, { label, meaning }]) => `${label} = ${meaning}`)
}

function didNotStart(result: Result): boolean {
  return result.positionText === 'W' || result.positionText === 'F'
}

/** Starting position; grid "0" is a pit-lane start, except for drivers who never started. */
export function gridLabel(result: Result): string {
  if (!result.grid) return '—'
  if (result.grid === '0') return didNotStart(result) ? '—' : 'Box'
  return result.grid
}

/** Positions gained (positive) or lost (negative); null when it cannot be computed. */
export function positionChange(result: Result): number | null {
  const grid = Number(result.grid)
  if (!result.grid || !Number.isInteger(grid) || grid <= 0 || !isClassified(result)) return null
  return grid - Number(result.positionText)
}

/** Laps completed by the leader: the reference to tell how many laps behind the others are. */
export function leaderLaps(results: Result[]): number | null {
  const laps = results.map((result) => Number(result.laps)).filter((value) => Number.isFinite(value) && value > 0)
  return laps.length > 0 ? Math.max(...laps) : null
}

function lapsBehindLabel(laps: number): string {
  return laps === 1 ? '+1 giro' : `+${laps} giri`
}

const STATUS_TRANSLATIONS: Record<string, string> = {
  Finished: 'Arrivato',
  Lapped: 'Doppiato',
  Retired: 'Ritirato',
  Disqualified: 'Squalificato',
  Excluded: 'Escluso',
  Withdrew: 'Ritirato prima del via',
  'Did not start': 'Non partito',
  'Did not qualify': 'Non qualificato',
  'Did not prequalify': 'Non prequalificato',
  'Not classified': 'Non classificato',
  Accident: 'Incidente',
  Collision: 'Collisione',
  'Collision damage': 'Danni da collisione',
  Damage: 'Danni',
  'Spun off': 'Testacoda',
  Engine: 'Motore',
  'Power Unit': 'Power unit',
  Gearbox: 'Cambio',
  Transmission: 'Trasmissione',
  Clutch: 'Frizione',
  Driveshaft: 'Semiasse',
  Halfshaft: 'Semiasse',
  Hydraulics: 'Impianto idraulico',
  Electrical: 'Impianto elettrico',
  Electronics: 'Elettronica',
  Battery: 'Batteria',
  Brakes: 'Freni',
  Suspension: 'Sospensioni',
  Steering: 'Sterzo',
  Wheel: 'Ruota',
  'Wheel nut': 'Dado della ruota',
  Tyre: 'Pneumatico',
  Puncture: 'Foratura',
  Overheating: 'Surriscaldamento',
  Radiator: 'Radiatore',
  Exhaust: 'Scarico',
  Throttle: 'Acceleratore',
  Ignition: 'Accensione',
  Magneto: 'Magnete',
  Supercharger: 'Compressore',
  'Fuel system': 'Impianto di alimentazione',
  'Fuel pump': 'Pompa della benzina',
  'Fuel pressure': 'Pressione della benzina',
  'Fuel leak': 'Perdita di benzina',
  'Out of fuel': 'Senza benzina',
  'Oil leak': "Perdita d'olio",
  'Oil pressure': "Pressione dell'olio",
  'Oil pipe': "Tubo dell'olio",
  'Water leak': "Perdita d'acqua",
  Mechanical: 'Guasto meccanico',
  Vibrations: 'Vibrazioni',
  Fire: 'Incendio',
  Injured: 'Infortunato',
  Illness: 'Malattia',
}

/** Italian status for the most common values; rare ones are shown as the API returns them. */
export function translateStatus(status: string | undefined): string {
  if (!status) return '—'
  const laps = /^\+(\d+) Laps?$/.exec(status)
  if (laps) return lapsBehindLabel(Number(laps[1]))
  return STATUS_TRANSLATIONS[status] ?? status
}

/**
 * Race time for drivers on the leader's lap, laps behind for the other
 * classified drivers, otherwise the status. Laps are computed from the lap
 * count because recent data gives lapped drivers a misleading gap time.
 */
export function timeOrStatus(result: Result, lapsOfLeader: number | null): string {
  if (isClassified(result)) {
    const laps = Number(result.laps)
    if (lapsOfLeader !== null && result.laps && Number.isFinite(laps) && laps < lapsOfLeader) {
      return lapsBehindLabel(lapsOfLeader - laps)
    }
    if (result.Time?.time) return result.Time.time
  }
  return translateStatus(result.status)
}

export function fastestLapTime(result: Result): string | null {
  return result.FastestLap?.Time?.time || null
}

/** True for the fastest lap of the whole race. */
export function isFastestLap(result: Result): boolean {
  return result.FastestLap?.rank === '1'
}

/** Fastest laps are recorded only from 2004: older tables hide the column. */
export function hasAnyFastestLap(results: Result[]): boolean {
  return results.some((result) => fastestLapTime(result) !== null)
}

/** Qualifying sessions with at least one time (one before 2006, Q1–Q3 afterwards). */
export function qualifyingColumns(results: QualifyingResult[]): QualifyingColumn[] {
  const columns: QualifyingColumn[] = ['Q1', 'Q2', 'Q3']
  return columns.filter((column) => results.some((result) => Boolean(result[column])))
}

/** The previous and next race of the season, next only when it has already been run. */
export function adjacentRaces(races: Race[], round: number, now: number): AdjacentRaces {
  const index = races.findIndex((race) => Number(race.round) === round)
  if (index === -1) return { previous: null, next: null }
  const next = races[index + 1] ?? null
  return {
    previous: races[index - 1] ?? null,
    next: next && raceStatus(next, now) === 'past' ? next : null,
  }
}

/** The last race of the season already run, or null when the season has not started. */
export function latestCompletedRace(races: Race[], now: number): Race | null {
  return races.filter((race) => raceStatus(race, now) === 'past').at(-1) ?? null
}

export function resultsPath(race: Pick<Race, 'season' | 'round'>): string {
  return `/risultati/${race.season}/${race.round}`
}
