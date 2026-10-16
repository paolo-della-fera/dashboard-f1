import { describe, expect, it } from 'vitest'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import type { ConstructorStanding, DriverStanding } from '../../types/jolpica.ts'
import {
  buildPointsProgression,
  completedRounds,
  driverTeams,
  formatPoints,
  hasConstructorStandings,
  parseKind,
  parsePoints,
  positionLabel,
  standingId,
  standingName,
  topSeries,
} from '../standings.ts'

function driver(id: string, points: string, extra: Partial<DriverStanding> = {}): DriverStanding {
  return {
    position: '1',
    positionText: '1',
    points,
    wins: '0',
    Driver: { driverId: id, givenName: 'Given', familyName: id },
    Constructors: [{ constructorId: 'mclaren', name: 'McLaren' }],
    ...extra,
  }
}

function constructor(id: string, points: string): ConstructorStanding {
  return {
    position: '1',
    positionText: '1',
    points,
    wins: '0',
    Constructor: { constructorId: id, name: id.toUpperCase() },
  }
}

describe('parsePoints / formatPoints', () => {
  it('handles integers, fractions and missing values', () => {
    expect(parsePoints('25')).toBe(25)
    expect(parsePoints('0.5')).toBe(0.5)
    expect(parsePoints('1.14')).toBe(1.14)
    expect(parsePoints('')).toBe(0)
    expect(parsePoints(undefined)).toBe(0)
    expect(parsePoints('abc')).toBe(0)
  })

  it('formats in Italian with at most two decimals', () => {
    expect(formatPoints(87)).toBe('87')
    expect(formatPoints(0.5)).toBe('0,5')
    expect(formatPoints(30.142857)).toBe('30,14')
  })
})

describe('standing helpers', () => {
  it('reads id and name of drivers and constructors', () => {
    expect(standingId(driver('senna', '90'))).toBe('senna')
    expect(standingName(driver('senna', '90'))).toBe('Given senna')
    expect(standingId(constructor('ferrari', '10'))).toBe('ferrari')
    expect(standingName(constructor('ferrari', '10'))).toBe('FERRARI')
  })

  it('shows SQ for drivers excluded from the championship', () => {
    expect(positionLabel(driver('schumacher', '78', { position: '22', positionText: 'D' }))).toBe('SQ')
    expect(positionLabel(driver('villeneuve', '81', { position: '1', positionText: '1' }))).toBe('1')
    expect(positionLabel(driver('x', '0', { position: undefined, positionText: '' }))).toBe('—')
  })

  it('shows "NC" for a driver listed without a position', () => {
    expect(positionLabel(driver('senna', '0', { position: undefined, positionText: '-' }))).toBe('NC')
  })

  it('joins the teams of a driver who changed team', () => {
    const standing = driver('a', '0', {
      Constructors: [
        { constructorId: 'a', name: 'Alpine' },
        { constructorId: 'b', name: 'Williams' },
      ],
    })
    expect(driverTeams(standing)).toBe('Alpine / Williams')
  })

  it('knows when constructor standings exist', () => {
    expect(hasConstructorStandings(1957)).toBe(false)
    expect(hasConstructorStandings(1958)).toBe(true)
  })

  it('parses the standings kind from the URL', () => {
    expect(parseKind('costruttori')).toBe('constructors')
    expect(parseKind(null)).toBe('drivers')
    expect(parseKind('altro')).toBe('drivers')
  })

  it('takes the first n entries', () => {
    const standings = [driver('a', '30'), driver('b', '20'), driver('c', '10')]
    expect(topSeries(standings, 2)).toEqual([
      { id: 'a', name: 'Given a' },
      { id: 'b', name: 'Given b' },
    ])
    expect(topSeries(standings, 10)).toHaveLength(3)
  })
})

describe('completedRounds', () => {
  it('keeps only races already over', () => {
    const races = [
      makeRace(2026, 1, { date: '2026-03-08', time: '04:00:00Z' }),
      makeRace(2026, 2, { date: '2026-03-15', time: '07:00:00Z' }),
      makeRace(2026, 3, { date: '2026-03-29', time: '05:00:00Z' }),
    ]
    // During round 2 (live), only round 1 counts.
    expect(completedRounds(races, Date.UTC(2026, 2, 15, 8))).toEqual([1])
    expect(completedRounds(races, Date.UTC(2026, 11, 1))).toEqual([1, 2, 3])
    expect(completedRounds(races, Date.UTC(2026, 0, 1))).toEqual([])
  })
})

describe('buildPointsProgression', () => {
  const races = [
    makeRace(1988, 1, { raceName: 'Brazilian Grand Prix' }),
    makeRace(1988, 2, { raceName: 'San Marino Grand Prix' }),
    makeRace(1988, 3, { raceName: 'Monaco Grand Prix' }),
  ]

  it('builds one row per round, sorted, with official points', () => {
    const rows = buildPointsProgression(
      [
        { round: 2, standings: [driver('prost', '15'), driver('senna', '9')] },
        { round: 1, standings: [driver('prost', '9'), driver('senna', '0')] },
      ],
      races,
      ['senna', 'prost'],
    )
    expect(rows).toEqual([
      { round: 1, label: 'R1', raceName: 'Brazilian Grand Prix', points: { senna: 0, prost: 9 } },
      { round: 2, label: 'R2', raceName: 'San Marino Grand Prix', points: { senna: 9, prost: 15 } },
    ])
  })

  it('uses 0 before the first appearance and carries values forward when missing', () => {
    const rows = buildPointsProgression(
      [
        { round: 1, standings: [driver('a', '6')] },
        { round: 2, standings: [driver('a', '6.5'), driver('late', '4')] },
        { round: 3, standings: [driver('a', '10')] },
      ],
      races,
      ['a', 'late'],
    )
    expect(rows.map((row) => row.points)).toEqual([
      { a: 6, late: 0 },
      { a: 6.5, late: 4 },
      { a: 10, late: 4 },
    ])
  })

  it('ends with the same points as the final standings (dropped scores included)', () => {
    // 1988: Prost scored 105 points but only 87 counted; the official
    // standings after each round already apply the rule.
    const final = [driver('senna', '90'), driver('prost', '87')]
    const rows = buildPointsProgression(
      [
        { round: 1, standings: [driver('prost', '9'), driver('senna', '0')] },
        { round: 3, standings: final },
      ],
      races,
      ['senna', 'prost'],
    )
    const lastRow = rows.at(-1)
    for (const standing of final) {
      expect(lastRow?.points[standingId(standing)]).toBe(parsePoints(standing.points))
    }
  })

  it('works for constructors and unknown round names', () => {
    const rows = buildPointsProgression(
      [{ round: 9, standings: [constructor('ferrari', '16')] }],
      races,
      ['ferrari'],
    )
    expect(rows).toEqual([{ round: 9, label: 'R9', raceName: 'Round 9', points: { ferrari: 16 } }])
  })

  it('returns no rows without history', () => {
    expect(buildPointsProgression([], races, ['a'])).toEqual([])
  })
})
