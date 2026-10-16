import type { Race, StandingsList } from '../types/jolpica.ts'

// The API paginates individual rows (results, standings entries), not races or
// standings lists, so one race can be split across two pages. These functions
// stitch the pieces back together, keeping the original order.

function concatOptional<T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined {
  if (!a) return b
  if (!b) return a
  return [...a, ...b]
}

export function mergeRaces(races: Race[]): Race[] {
  const merged: Race[] = []
  const byKey = new Map<string, Race>()
  for (const race of races) {
    const key = `${race.season}-${race.round}`
    const existing = byKey.get(key)
    if (!existing) {
      const copy = { ...race }
      byKey.set(key, copy)
      merged.push(copy)
      continue
    }
    existing.Results = concatOptional(existing.Results, race.Results)
    existing.QualifyingResults = concatOptional(existing.QualifyingResults, race.QualifyingResults)
    existing.SprintResults = concatOptional(existing.SprintResults, race.SprintResults)
  }
  return merged
}

export function mergeStandingsLists(lists: StandingsList[]): StandingsList[] {
  const merged: StandingsList[] = []
  const byKey = new Map<string, StandingsList>()
  for (const list of lists) {
    const key = `${list.season}-${list.round}`
    const existing = byKey.get(key)
    if (!existing) {
      const copy = { ...list }
      byKey.set(key, copy)
      merged.push(copy)
      continue
    }
    existing.DriverStandings = concatOptional(existing.DriverStandings, list.DriverStandings)
    existing.ConstructorStandings = concatOptional(
      existing.ConstructorStandings,
      list.ConstructorStandings,
    )
  }
  return merged
}
