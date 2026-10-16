import { describe, expect, it } from 'vitest'
import { makeRace, makeResult } from '../../api/__tests__/fixtures.ts'
import type { QualifyingResult, Result } from '../../types/jolpica.ts'
import {
  adjacentRaces,
  fastestLapTime,
  gridLabel,
  hasAnyFastestLap,
  isClassified,
  isFastestLap,
  latestCompletedRace,
  leaderLaps,
  parseRaceParams,
  parseSession,
  positionChange,
  positionLegend,
  qualifyingColumns,
  resultPositionLabel,
  resultsPath,
  timeOrStatus,
  translateStatus,
} from '../results.ts'

function result(extra: Partial<Result> = {}): Result {
  return { ...makeResult(0), ...extra }
}

function qualifying(extra: Partial<QualifyingResult> = {}): QualifyingResult {
  const { Driver, Constructor } = makeResult(0)
  return { position: '1', Driver, Constructor, ...extra }
}

describe('parseRaceParams', () => {
  it('accepts a valid season and round', () => {
    expect(parseRaceParams('1988', '1', 2026)).toEqual({ season: 1988, round: 1 })
    expect(parseRaceParams('2026', '24', 2026)).toEqual({ season: 2026, round: 24 })
  })

  it('rejects missing, malformed or out-of-range values', () => {
    expect(parseRaceParams(undefined, '1', 2026)).toBeNull()
    expect(parseRaceParams('2026', undefined, 2026)).toBeNull()
    expect(parseRaceParams('abc', '1', 2026)).toBeNull()
    expect(parseRaceParams('2026', 'x', 2026)).toBeNull()
    expect(parseRaceParams('1949', '1', 2026)).toBeNull()
    expect(parseRaceParams('2027', '1', 2026)).toBeNull()
    expect(parseRaceParams('2026', '0', 2026)).toBeNull()
    expect(parseRaceParams('2026', '123', 2026)).toBeNull()
  })
})

describe('parseSession', () => {
  it('defaults to the race', () => {
    expect(parseSession(null, true)).toBe('race')
    expect(parseSession('altro', true)).toBe('race')
  })

  it('reads qualifying and sprint', () => {
    expect(parseSession('qualifiche', false)).toBe('qualifying')
    expect(parseSession('sprint', true)).toBe('sprint')
  })

  it('ignores the sprint when the weekend has none', () => {
    expect(parseSession('sprint', false)).toBe('race')
  })
})

describe('positions', () => {
  it('labels classified and unclassified drivers', () => {
    expect(isClassified(result({ positionText: '3' }))).toBe(true)
    expect(isClassified(result({ positionText: 'R' }))).toBe(false)
    expect(resultPositionLabel(result({ positionText: '3' }))).toBe('3')
    expect(resultPositionLabel(result({ positionText: 'R' }))).toBe('Rit.')
    expect(resultPositionLabel(result({ positionText: 'D' }))).toBe('SQ')
    expect(resultPositionLabel(result({ positionText: 'W' }))).toBe('NP')
    expect(resultPositionLabel(result({ positionText: 'N' }))).toBe('NC')
    expect(resultPositionLabel(result({ positionText: 'X' }))).toBe('X')
    expect(resultPositionLabel(result({ positionText: '' }))).toBe('—')
  })

  it('builds the legend only for the codes in use', () => {
    const results = [result({ positionText: '1' }), result({ positionText: 'R' }), result({ positionText: 'D' })]
    expect(positionLegend(results)).toEqual(['Rit. = ritirato', 'SQ = squalificato'])
    expect(positionLegend([result({ positionText: '1' })])).toEqual([])
  })
})

describe('grid and position change', () => {
  it('labels the grid', () => {
    expect(gridLabel(result({ grid: '4' }))).toBe('4')
    expect(gridLabel(result({ grid: '0' }))).toBe('Box')
    expect(gridLabel(result({ grid: '0', positionText: 'W' }))).toBe('—')
    expect(gridLabel(result({ grid: undefined }))).toBe('—')
    expect(gridLabel(result({ grid: '' }))).toBe('—')
  })

  it('computes gained and lost positions', () => {
    expect(positionChange(result({ grid: '5', positionText: '2' }))).toBe(3)
    expect(positionChange(result({ grid: '1', positionText: '4' }))).toBe(-3)
    expect(positionChange(result({ grid: '3', positionText: '3' }))).toBe(0)
  })

  it('has no change for pit-lane starts, missing grids and unclassified drivers', () => {
    expect(positionChange(result({ grid: '0', positionText: '10' }))).toBeNull()
    expect(positionChange(result({ grid: undefined, positionText: '1' }))).toBeNull()
    expect(positionChange(result({ grid: '5', positionText: 'R' }))).toBeNull()
  })
})

describe('time or status', () => {
  const winner = result({ laps: '58', status: 'Finished', Time: { time: '1:26:07.469' } })
  const second = result({ laps: '58', status: 'Finished', Time: { time: '+12.594' } })
  // Recent data: lapped cars have a gap time that would read as on the lead lap.
  const lapped = result({ positionText: '18', laps: '57', status: 'Lapped', Time: { time: '+4.659' } })

  it('finds the laps of the leader', () => {
    expect(leaderLaps([winner, lapped])).toBe(58)
    expect(leaderLaps([result({ laps: undefined })])).toBeNull()
  })

  it('shows the time on the lead lap and the laps behind otherwise', () => {
    expect(timeOrStatus(winner, 58)).toBe('1:26:07.469')
    expect(timeOrStatus(second, 58)).toBe('+12.594')
    expect(timeOrStatus(lapped, 58)).toBe('+1 giro')
    expect(timeOrStatus(result({ positionText: '9', laps: '64', status: '+6 Laps' }), 70)).toBe('+6 giri')
  })

  it('falls back to the translated status', () => {
    expect(timeOrStatus(result({ positionText: 'R', laps: '5', status: 'Gearbox' }), 70)).toBe('Cambio')
    expect(timeOrStatus(result({ positionText: '3', laps: '70', status: 'Finished' }), 70)).toBe('Arrivato')
    expect(timeOrStatus(result({ positionText: 'R', status: undefined }), null)).toBe('—')
  })

  it('translates statuses', () => {
    expect(translateStatus('+1 Lap')).toBe('+1 giro')
    expect(translateStatus('+3 Laps')).toBe('+3 giri')
    expect(translateStatus('Disqualified')).toBe('Squalificato')
    expect(translateStatus('Unusual failure')).toBe('Unusual failure')
    expect(translateStatus(undefined)).toBe('—')
  })
})

describe('fastest lap', () => {
  const fastest = result({ FastestLap: { rank: '1', lap: '44', Time: { time: '1:26.765' } } })
  const slower = result({ FastestLap: { rank: '5', Time: { time: '1:27.625' } } })

  it('reads the lap time and the fastest of the race', () => {
    expect(fastestLapTime(fastest)).toBe('1:26.765')
    expect(isFastestLap(fastest)).toBe(true)
    expect(isFastestLap(slower)).toBe(false)
    expect(fastestLapTime(result())).toBeNull()
    expect(fastestLapTime(result({ FastestLap: { rank: '0' } }))).toBeNull()
  })

  it('detects tables without any fastest lap', () => {
    expect(hasAnyFastestLap([result(), slower])).toBe(true)
    expect(hasAnyFastestLap([result(), result()])).toBe(false)
  })
})

describe('qualifyingColumns', () => {
  it('keeps only sessions with times, ignoring empty strings', () => {
    expect(qualifyingColumns([qualifying({ Q1: '1:30.1', Q2: '1:29.5', Q3: '1:29.0' })])).toEqual([
      'Q1',
      'Q2',
      'Q3',
    ])
    expect(qualifyingColumns([qualifying({ Q1: '1:33.171', Q2: '1:28.289' }), qualifying({ Q1: '' })])).toEqual([
      'Q1',
      'Q2',
    ])
    expect(qualifyingColumns([qualifying()])).toEqual([])
  })
})

describe('race navigation', () => {
  const races = [
    makeRace(2026, 1, { date: '2026-03-08' }),
    makeRace(2026, 2, { date: '2026-03-15' }),
    makeRace(2026, 3, { date: '2026-03-29' }),
  ]
  const now = Date.UTC(2026, 2, 20)

  it('finds the previous and the next completed race', () => {
    expect(adjacentRaces(races, 1, now)).toEqual({ previous: null, next: races[1] })
    expect(adjacentRaces(races, 2, now)).toEqual({ previous: races[0], next: null })
    expect(adjacentRaces(races, 9, now)).toEqual({ previous: null, next: null })
  })

  it('finds the latest completed race', () => {
    expect(latestCompletedRace(races, now)).toBe(races[1])
    expect(latestCompletedRace(races, Date.UTC(2026, 0, 1))).toBeNull()
  })

  it('builds the results path', () => {
    expect(resultsPath(races[2])).toBe('/risultati/2026/3')
  })
})
