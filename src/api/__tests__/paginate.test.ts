import { describe, expect, it } from 'vitest'
import type { StandingsList } from '../../types/jolpica.ts'
import { mergeRaces, mergeStandingsLists } from '../paginate.ts'
import { makeDriver, makeRace, makeResult } from './fixtures.ts'

describe('mergeRaces', () => {
  it('joins a race split across two pages', () => {
    const merged = mergeRaces([
      makeRace(2024, 1, { Results: [makeResult(0), makeResult(1)] }),
      makeRace(2024, 1, { Results: [makeResult(2)] }),
      makeRace(2024, 2, { Results: [makeResult(0)] }),
    ])

    expect(merged).toHaveLength(2)
    expect(merged[0].Results?.map((r) => r.position)).toEqual(['1', '2', '3'])
    expect(merged[1].round).toBe('2')
  })

  it('keeps races without results untouched', () => {
    const races = [makeRace(1950, 1), makeRace(1950, 2)]
    expect(mergeRaces(races)).toEqual(races)
  })

  it('joins qualifying and sprint results too', () => {
    const qualifying = { position: '1', Driver: makeDriver(0), Constructor: { constructorId: 't', name: 'T' } }
    const merged = mergeRaces([
      makeRace(2024, 5, { QualifyingResults: [qualifying], SprintResults: [makeResult(0)] }),
      makeRace(2024, 5, { QualifyingResults: [qualifying], SprintResults: [makeResult(1)] }),
    ])

    expect(merged[0].QualifyingResults).toHaveLength(2)
    expect(merged[0].SprintResults).toHaveLength(2)
  })

  it('does not mutate its input', () => {
    const first = makeRace(2024, 1, { Results: [makeResult(0)] })
    mergeRaces([first, makeRace(2024, 1, { Results: [makeResult(1)] })])
    expect(first.Results).toHaveLength(1)
  })
})

describe('mergeStandingsLists', () => {
  it('joins standings of the same season split across pages', () => {
    const standing = (i: number) => ({
      positionText: String(i + 1),
      points: '0',
      wins: '0',
      Driver: makeDriver(i),
      Constructors: [],
    })
    const lists: StandingsList[] = [
      { season: '1953', round: '9', DriverStandings: [standing(0), standing(1)] },
      { season: '1953', round: '9', DriverStandings: [standing(2)] },
      { season: '1954', round: '9', DriverStandings: [standing(0)] },
    ]

    const merged = mergeStandingsLists(lists)

    expect(merged).toHaveLength(2)
    expect(merged[0].DriverStandings).toHaveLength(3)
  })
})
