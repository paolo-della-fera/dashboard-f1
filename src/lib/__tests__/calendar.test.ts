import { describe, expect, it } from 'vitest'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import {
  countdownParts,
  findNextRace,
  formatRaceDate,
  parseSeason,
  raceStart,
  raceStatus,
  seasonOptions,
} from '../calendar.ts'

const HOUR = 60 * 60 * 1000

describe('raceStart', () => {
  it('combines date and UTC time', () => {
    const race = makeRace(2026, 1, { date: '2026-03-08', time: '04:00:00Z' })
    expect(raceStart(race).toISOString()).toBe('2026-03-08T04:00:00.000Z')
  })

  it('uses midnight UTC when the time is missing', () => {
    const race = makeRace(1988, 1, { date: '1988-04-03' })
    expect(raceStart(race).toISOString()).toBe('1988-04-03T00:00:00.000Z')
  })

  it('treats a time without zone as UTC', () => {
    const race = makeRace(2026, 1, { date: '2026-03-08', time: '04:00:00' })
    expect(raceStart(race).toISOString()).toBe('2026-03-08T04:00:00.000Z')
  })
})

describe('raceStatus', () => {
  const race = makeRace(2026, 1, { date: '2026-03-08', time: '04:00:00Z' })
  const start = Date.UTC(2026, 2, 8, 4)

  it('is upcoming before the start', () => {
    expect(raceStatus(race, start - 1)).toBe('upcoming')
  })

  it('is live from the start for three hours', () => {
    expect(raceStatus(race, start)).toBe('live')
    expect(raceStatus(race, start + 3 * HOUR - 1)).toBe('live')
  })

  it('is past afterwards', () => {
    expect(raceStatus(race, start + 3 * HOUR)).toBe('past')
  })
})

describe('findNextRace', () => {
  const races = [
    makeRace(2026, 1, { date: '2026-03-08', time: '04:00:00Z' }),
    makeRace(2026, 2, { date: '2026-03-15', time: '07:00:00Z' }),
  ]

  it('returns the first race not concluded', () => {
    expect(findNextRace(races, Date.UTC(2026, 2, 10))?.round).toBe('2')
  })

  it('includes a live race', () => {
    expect(findNextRace(races, Date.UTC(2026, 2, 8, 5))?.round).toBe('1')
  })

  it('returns null when the season is over or empty', () => {
    expect(findNextRace(races, Date.UTC(2026, 11, 1))).toBeNull()
    expect(findNextRace([], Date.UTC(2026, 0, 1))).toBeNull()
  })
})

describe('countdownParts', () => {
  it('splits the remaining time', () => {
    const now = 0
    const target = 2 * 24 * HOUR + 3 * HOUR + 4 * 60_000 + 5_000
    expect(countdownParts(target, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  it('never goes negative', () => {
    expect(countdownParts(0, 10_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe('seasonOptions', () => {
  it('lists seasons from the current one back to 1950', () => {
    const options = seasonOptions(2026)
    expect(options[0]).toBe(2026)
    expect(options.at(-1)).toBe(1950)
    expect(options).toHaveLength(77)
  })
})

describe('parseSeason', () => {
  it('accepts a valid year', () => {
    expect(parseSeason('1988', 2026)).toBe(1988)
  })

  it('falls back to the current year', () => {
    for (const param of [null, '', 'abc', '1949', '2027', '19888']) {
      expect(parseSeason(param, 2026)).toBe(2026)
    }
  })
})

describe('formatRaceDate', () => {
  it('shows only the date when the time is missing', () => {
    expect(formatRaceDate(makeRace(1988, 1, { date: '1988-04-03' }))).toBe('3 apr 1988')
  })

  it('shows date and time in the given time zone', () => {
    const race = makeRace(2026, 1, { date: '2026-03-08', time: '04:00:00Z' })
    expect(formatRaceDate(race, 'Europe/Rome')).toBe('8 mar 2026, 05:00')
  })
})
