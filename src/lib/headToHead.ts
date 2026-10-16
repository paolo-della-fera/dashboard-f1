import type { Constructor, DriverStanding, QualifyingResult, Race, Result, StandingsList } from '../types/jolpica.ts'
import { raceStatus } from './calendar.ts'
import { isClassified } from './results.ts'
import { parsePoints } from './standings.ts'

/** Fastest laps are recorded only from this season. */
export const FIRST_FASTEST_LAP_SEASON = 2004
// 2021 sprint weekends: the official pole went to the sprint winner, who started the race from grid 1.
const SPRINT_POLE_RACES = new Set(['2021-10', '2021-14', '2021-19'])

/** A driver's whole career, as returned by the driver endpoints of the API. */
export interface DriverCareer {
  driverId: string
  results: Race[]
  qualifying: Race[]
  standings: StandingsList[]
}

export interface TeamSpell {
  constructorId: string
  name: string
  seasons: number[]
}

export interface FastestLapStats {
  count: number
  /** Races started from 2004, the only ones with fastest lap data. */
  coveredStarts: number
  /** True when part of the career predates the fastest lap data. */
  partial: boolean
}

export interface SeasonStats {
  season: number
  teams: string[]
  starts: number
  wins: number
  podiums: number
  poles: number
  position: string
  /** Official championship points: not comparable across eras. */
  points: number | null
  provisional: boolean
}

export interface BestChampionshipPosition {
  position: number
  seasons: number[]
}

export interface DriverStats {
  starts: number
  wins: number
  podiums: number
  poles: number
  fastestLaps: FastestLapStats | null
  retirements: number
  titles: number[]
  seasons: number
  teams: TeamSpell[]
  winRate: number | null
  podiumRate: number | null
  poleRate: number | null
  bestChampionshipPosition: BestChampionshipPosition | null
  seasonBySeason: SeasonStats[]
}

export interface AheadCount {
  aAhead: number
  bAhead: number
}

export interface RaceComparison extends AheadCount {
  bothUnclassified: number
}

export interface QualifyingComparison extends AheadCount {
  /** Comparisons decided on the starting grid (no qualifying data). */
  fromGrid: number
}

export interface TeammateSeason {
  season: number
  teams: string[]
  races: number
  a: { position: string; points: number | null }
  b: { position: string; points: number | null }
}

export interface TeammateComparison {
  races: number
  seasons: TeammateSeason[]
  race: RaceComparison
  qualifying: QualifyingComparison
}

export interface HeadToHead {
  racesTogether: number
  race: RaceComparison
  qualifying: QualifyingComparison
  teammates: TeammateComparison | null
}

/** One race started by the driver, reduced to what the statistics need. */
interface Start {
  key: string
  season: number
  round: number
  result: Result
  constructors: Constructor[]
  qualifying: QualifyingResult | null
}

function raceKey(race: Pick<Race, 'season' | 'round'>): string {
  return `${race.season}-${race.round}`
}

function started(result: Result): boolean {
  return result.positionText !== 'W' && result.positionText !== 'F'
}

function numericPosition(result: Result): number {
  const value = Number(result.position)
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

/** With shared drives a driver has several rows: the best classified one, else the lowest position. */
function representativeResult(results: Result[]): Result {
  const classified = results.filter(isClassified)
  const pool = classified.length > 0 ? classified : results
  return pool.reduce((best, result) => (numericPosition(result) < numericPosition(best) ? result : best))
}

function uniqueConstructors(results: Result[]): Constructor[] {
  const byId = new Map(results.map((result) => [result.Constructor.constructorId, result.Constructor]))
  return [...byId.values()]
}

/** The races the driver started, in chronological order. */
function careerStarts(career: DriverCareer): Start[] {
  const qualifyingByKey = new Map<string, QualifyingResult>()
  for (const race of career.qualifying) {
    const entry = race.QualifyingResults?.find((result) => result.Driver.driverId === career.driverId)
    if (entry) qualifyingByKey.set(raceKey(race), entry)
  }
  const starts: Start[] = []
  for (const race of career.results) {
    const rows = (race.Results ?? []).filter(
      (result) => result.Driver.driverId === career.driverId && started(result),
    )
    if (rows.length === 0) continue
    const key = raceKey(race)
    starts.push({
      key,
      season: Number(race.season),
      round: Number(race.round),
      result: representativeResult(rows),
      constructors: uniqueConstructors(rows),
      qualifying: qualifyingByKey.get(key) ?? null,
    })
  }
  return starts.sort((a, b) => a.season - b.season || a.round - b.round)
}

function isWin(start: Start): boolean {
  return isClassified(start.result) && start.result.positionText === '1'
}

function isPodium(start: Start): boolean {
  return isClassified(start.result) && Number(start.result.positionText) <= 3
}

/** Qualifying P1 when available, otherwise grid 1 (also for the 2021 sprint weekends). */
function isPole(start: Start): boolean {
  if (start.qualifying && !SPRINT_POLE_RACES.has(start.key)) return start.qualifying.position === '1'
  return start.result.grid === '1'
}

function isRetirement(start: Start): boolean {
  return start.result.positionText === 'R'
}

function rate(count: number, total: number): number | null {
  return total > 0 ? count / total : null
}

/** The current year when all its races have been run, otherwise the year before. */
export function lastConcludedSeason(currentYear: number, currentSchedule: Race[], now: number): number {
  const finished =
    currentSchedule.length > 0 && currentSchedule.every((race) => raceStatus(race, now) === 'past')
  return finished ? currentYear : currentYear - 1
}

function driverStanding(list: StandingsList) {
  return list.DriverStandings?.[0] ?? null
}

function standingsBySeason(career: DriverCareer) {
  return new Map(career.standings.map((list) => [Number(list.season), driverStanding(list)]))
}

/** Championship position: "SQ" when excluded (Schumacher 1997), "NC" when listed without a position, "—" when absent. */
function championshipLabel(standing: DriverStanding | null | undefined): string {
  if (!standing) return '—'
  if (standing.positionText === 'D') return 'SQ'
  if (standing.position && /^\d+$/.test(standing.positionText)) return standing.position
  return 'NC'
}

function championshipPosition(list: StandingsList): number | null {
  const standing = driverStanding(list)
  if (!standing?.position || !/^\d+$/.test(standing.positionText)) return null
  return Number(standing.position)
}

function teamSpells(starts: Start[]): TeamSpell[] {
  const spells = new Map<string, TeamSpell>()
  for (const start of starts) {
    for (const constructor of start.constructors) {
      const spell = spells.get(constructor.constructorId) ?? {
        constructorId: constructor.constructorId,
        name: constructor.name,
        seasons: [],
      }
      if (!spell.seasons.includes(start.season)) spell.seasons.push(start.season)
      spells.set(constructor.constructorId, spell)
    }
  }
  return [...spells.values()]
}

function teamNames(starts: Start[]): string[] {
  return teamSpells(starts).map((spell) => spell.name)
}

function fastestLapStats(starts: Start[]): FastestLapStats | null {
  const covered = starts.filter((start) => start.season >= FIRST_FASTEST_LAP_SEASON)
  if (covered.length === 0) return null
  return {
    count: covered.filter((start) => start.result.FastestLap?.rank === '1').length,
    coveredStarts: covered.length,
    partial: covered.length < starts.length,
  }
}

function bestPosition(career: DriverCareer, lastConcluded: number): BestChampionshipPosition | null {
  let best: BestChampionshipPosition | null = null
  for (const list of career.standings) {
    const season = Number(list.season)
    const position = championshipPosition(list)
    if (season > lastConcluded || position === null) continue
    if (!best || position < best.position) best = { position, seasons: [season] }
    else if (position === best.position) best.seasons.push(season)
  }
  if (best) best.seasons.sort((a, b) => a - b)
  return best
}

function seasonStats(starts: Start[], career: DriverCareer, lastConcluded: number): SeasonStats[] {
  const standings = standingsBySeason(career)
  const seasons = [...new Set([...starts.map((start) => start.season), ...standings.keys()])].sort((a, b) => a - b)
  return seasons.map((season) => {
    const inSeason = starts.filter((start) => start.season === season)
    const standing = standings.get(season) ?? null
    return {
      season,
      teams: teamNames(inSeason),
      starts: inSeason.length,
      wins: inSeason.filter(isWin).length,
      podiums: inSeason.filter(isPodium).length,
      poles: inSeason.filter(isPole).length,
      position: championshipLabel(standing),
      points: standing ? parsePoints(standing.points) : null,
      provisional: season > lastConcluded,
    }
  })
}

/** Career statistics of a driver; see the definitions in PIANO.md (Fase 5). */
export function driverStats(career: DriverCareer, lastConcluded: number): DriverStats {
  const starts = careerStarts(career)
  const wins = starts.filter(isWin).length
  const podiums = starts.filter(isPodium).length
  const poles = starts.filter(isPole).length
  const titles = career.standings
    .filter((list) => Number(list.season) <= lastConcluded && championshipPosition(list) === 1)
    .map((list) => Number(list.season))
    .sort((a, b) => a - b)
  return {
    starts: starts.length,
    wins,
    podiums,
    poles,
    fastestLaps: fastestLapStats(starts),
    retirements: starts.filter(isRetirement).length,
    titles,
    seasons: new Set(starts.map((start) => start.season)).size,
    teams: teamSpells(starts),
    winRate: rate(wins, starts.length),
    podiumRate: rate(podiums, starts.length),
    poleRate: rate(poles, starts.length),
    bestChampionshipPosition: bestPosition(career, lastConcluded),
    seasonBySeason: seasonStats(starts, career, lastConcluded),
  }
}

interface SharedRace {
  a: Start
  b: Start
}

function compareRaces(races: SharedRace[]): RaceComparison {
  const comparison: RaceComparison = { aAhead: 0, bAhead: 0, bothUnclassified: 0 }
  for (const { a, b } of races) {
    const aClassified = isClassified(a.result)
    const bClassified = isClassified(b.result)
    if (!aClassified && !bClassified) comparison.bothUnclassified++
    else if (!bClassified) comparison.aAhead++
    else if (!aClassified) comparison.bAhead++
    else if (Number(a.result.positionText) < Number(b.result.positionText)) comparison.aAhead++
    else if (Number(b.result.positionText) < Number(a.result.positionText)) comparison.bAhead++
  }
  return comparison
}

function validGrid(start: Start): number | null {
  const grid = Number(start.result.grid)
  return start.result.grid && Number.isInteger(grid) && grid >= 1 ? grid : null
}

function compareQualifying(races: SharedRace[]): QualifyingComparison {
  const comparison: QualifyingComparison = { aAhead: 0, bAhead: 0, fromGrid: 0 }
  for (const { a, b } of races) {
    let aValue: number | null
    let bValue: number | null
    if (a.qualifying && b.qualifying) {
      aValue = Number(a.qualifying.position)
      bValue = Number(b.qualifying.position)
    } else {
      aValue = validGrid(a)
      bValue = validGrid(b)
      if (aValue !== null && bValue !== null) comparison.fromGrid++
    }
    if (aValue === null || bValue === null || !Number.isFinite(aValue) || !Number.isFinite(bValue)) continue
    if (aValue < bValue) comparison.aAhead++
    else if (bValue < aValue) comparison.bAhead++
  }
  return comparison
}

function sharedTeams(race: SharedRace): Constructor[] {
  const bIds = new Set(race.b.constructors.map((constructor) => constructor.constructorId))
  return race.a.constructors.filter((constructor) => bIds.has(constructor.constructorId))
}

function seasonResult(standing: DriverStanding | null | undefined) {
  return {
    position: championshipLabel(standing),
    points: standing ? parsePoints(standing.points) : null,
  }
}

function teammateComparison(races: SharedRace[], a: DriverCareer, b: DriverCareer): TeammateComparison | null {
  const together = races.filter((race) => sharedTeams(race).length > 0)
  if (together.length === 0) return null
  const aStandings = standingsBySeason(a)
  const bStandings = standingsBySeason(b)
  const seasons = [...new Set(together.map((race) => race.a.season))]
  return {
    races: together.length,
    seasons: seasons.map((season) => {
      const inSeason = together.filter((race) => race.a.season === season)
      const teams = new Map(inSeason.flatMap(sharedTeams).map((team) => [team.constructorId, team.name]))
      return {
        season,
        teams: [...teams.values()],
        races: inSeason.length,
        a: seasonResult(aStandings.get(season)),
        b: seasonResult(bStandings.get(season)),
      }
    }),
    race: compareRaces(together),
    qualifying: compareQualifying(together),
  }
}

/** Direct comparison in the races both drivers started; see the definitions in PIANO.md (Fase 5). */
export function headToHead(a: DriverCareer, b: DriverCareer): HeadToHead {
  const bStarts = new Map(careerStarts(b).map((start) => [start.key, start]))
  const races: SharedRace[] = []
  for (const start of careerStarts(a)) {
    const other = bStarts.get(start.key)
    if (other) races.push({ a: start, b: other })
  }
  return {
    racesTogether: races.length,
    race: compareRaces(races),
    qualifying: compareQualifying(races),
    teammates: teammateComparison(races, a, b),
  }
}
