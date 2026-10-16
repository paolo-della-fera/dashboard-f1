import { describe, expect, it } from 'vitest'
import type { Driver } from '../../types/jolpica.ts'
import type { DriverStats, SeasonStats } from '../headToHead.ts'
import {
  careerPositionRows,
  countBars,
  driverDetails,
  driverLabel,
  FAMOUS_MATCHUPS,
  fastestLapDisplay,
  formatRate,
  formatSeasons,
  leader,
  rateBars,
  searchDrivers,
  shortName,
  statLeaders,
} from '../headToHeadView.ts'

function driver(driverId: string, givenName: string, familyName: string, dateOfBirth?: string): Driver {
  return { driverId, givenName, familyName, dateOfBirth }
}

const drivers = [
  driver('raikkonen', 'Kimi', 'Räikkönen', '1979-10-17'),
  driver('perez', 'Sergio', 'Pérez', '1990-01-26'),
  driver('michael_schumacher', 'Michael', 'Schumacher', '1969-01-03'),
  driver('ralf_schumacher', 'Ralf', 'Schumacher', '1975-06-30'),
  driver('mick_schumacher', 'Mick', 'Schumacher', '1999-03-22'),
  driver('gilles_villeneuve', 'Gilles', 'Villeneuve'),
  driver('jacques_villeneuve', 'Jacques', 'Villeneuve'),
  driver('michael_andretti', 'Michael', 'Andretti'),
]

function stats(extra: Partial<DriverStats> = {}): DriverStats {
  return {
    starts: 100,
    wins: 10,
    podiums: 30,
    poles: 5,
    fastestLaps: { count: 4, coveredStarts: 100, partial: false },
    retirements: 20,
    titles: [],
    seasons: 6,
    teams: [],
    winRate: 0.1,
    podiumRate: 0.3,
    poleRate: 0.05,
    bestChampionshipPosition: { position: 2, seasons: [2010] },
    seasonBySeason: [],
    ...extra,
  }
}

function season(year: number, position: string, provisional = false): SeasonStats {
  return { season: year, teams: [], starts: 10, wins: 0, podiums: 0, poles: 0, position, points: 0, provisional }
}

describe('searchDrivers', () => {
  it('ignores accents and case', () => {
    expect(searchDrivers(drivers, 'raikkonen').map((d) => d.driverId)).toEqual(['raikkonen'])
    expect(searchDrivers(drivers, 'PEREZ').map((d) => d.driverId)).toEqual(['perez'])
    expect(searchDrivers(drivers, 'Räik').map((d) => d.driverId)).toEqual(['raikkonen'])
  })

  it('needs every word of the query, in any order', () => {
    expect(searchDrivers(drivers, 'schumacher michael').map((d) => d.driverId)).toEqual(['michael_schumacher'])
    expect(searchDrivers(drivers, 'mi schu').map((d) => d.driverId)).toEqual(['michael_schumacher', 'mick_schumacher'])
  })

  it('puts surnames starting with the query first', () => {
    expect(searchDrivers(drivers, 'michael').map((d) => d.driverId)).toEqual(['michael_andretti', 'michael_schumacher'])
    // Surname match ("Andretti") beats a given-name prefix.
    expect(searchDrivers(drivers, 'and')[0].driverId).toBe('michael_andretti')
  })

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchDrivers(drivers, '   ')).toEqual([])
    expect(searchDrivers(drivers, 'schumacher', 2)).toHaveLength(2)
  })
})

describe('driver labels', () => {
  it('shows the full name and the birth year when known', () => {
    expect(driverLabel(drivers[0])).toBe('Kimi Räikkönen')
    expect(driverDetails(drivers[0])).toBe('n. 1979')
    expect(driverDetails(drivers[5])).toBeNull()
  })

  it('uses the surname, or the full name when both drivers share it', () => {
    expect(shortName(drivers[2], drivers[0])).toBe('Schumacher')
    expect(shortName(drivers[2], drivers[3])).toBe('Michael Schumacher')
    expect(shortName(drivers[2], null)).toBe('Schumacher')
  })
})

describe('leader', () => {
  it('picks the higher or lower value, nobody on a tie or missing value', () => {
    expect(leader(3, 2)).toBe('a')
    expect(leader(2, 3)).toBe('b')
    expect(leader(1, 2, 'lower')).toBe('a')
    expect(leader(2, 2)).toBeNull()
    expect(leader(null, 2)).toBeNull()
  })
})

describe('statLeaders', () => {
  it('compares wins, titles, rates and best championship position', () => {
    const a = stats({ wins: 41, titles: [1988, 1990, 1991], winRate: 0.25, bestChampionshipPosition: { position: 1, seasons: [1988] } })
    const b = stats({ wins: 51, titles: [1985, 1986, 1989, 1993], winRate: 0.26, bestChampionshipPosition: { position: 1, seasons: [1985] } })
    const leaders = statLeaders(a, b)
    expect(leaders.wins).toBe('b')
    expect(leaders.titles).toBe('b')
    expect(leaders.winRate).toBe('b')
    expect(leaders.bestChampionshipPosition).toBeNull()
  })

  it('compares fastest laps only when both careers are fully covered', () => {
    const full = stats({ fastestLaps: { count: 60, coveredStarts: 300, partial: false } })
    const partial = stats({ fastestLaps: { count: 50, coveredStarts: 50, partial: true } })
    const missing = stats({ fastestLaps: null })
    expect(statLeaders(full, stats()).fastestLaps).toBe('a')
    expect(statLeaders(full, partial).fastestLaps).toBeNull()
    expect(statLeaders(missing, full).fastestLaps).toBeNull()
  })
})

describe('fastestLapDisplay', () => {
  it('shows n.d. with the 2004 note when no race is covered', () => {
    expect(fastestLapDisplay(stats({ fastestLaps: null }))).toEqual({ value: 'n.d.', note: 'dati disponibili dal 2004' })
  })

  it('shows the count with the covered races when the career starts earlier', () => {
    const partial = stats({ starts: 306, fastestLaps: { count: 20, coveredStarts: 50, partial: true } })
    expect(fastestLapDisplay(partial)).toEqual({ value: '20', note: 'dati disponibili dal 2004 (50 gare su 306)' })
  })

  it('has no note for a fully covered career', () => {
    expect(fastestLapDisplay(stats())).toEqual({ value: '4', note: null })
  })
})

describe('formatting', () => {
  it('formats rates with the Italian decimal comma', () => {
    expect(formatRate(0.2547)).toBe('25,5%')
    expect(formatRate(0)).toBe('0,0%')
    expect(formatRate(null)).toBe('—')
  })

  it('joins consecutive seasons into ranges', () => {
    expect(formatSeasons([1988, 1990, 1991])).toBe('1988, 1990–1991')
    expect(formatSeasons([1993, 1984, 1985, 1986])).toBe('1984–1986, 1993')
    expect(formatSeasons([2007])).toBe('2007')
    expect(formatSeasons([])).toBe('')
  })
})

describe('chart rows', () => {
  it('builds count and rate bars', () => {
    const a = stats({ titles: [2008] })
    const b = stats({ wins: 0, winRate: null, podiumRate: null, poleRate: null })
    expect(countBars(a, b)).toEqual([
      { label: 'Vittorie', a: 10, b: 0 },
      { label: 'Podi', a: 30, b: 30 },
      { label: 'Pole', a: 5, b: 5 },
      { label: 'Titoli', a: 1, b: 0 },
    ])
    expect(rateBars(a, b)[0]).toEqual({ label: 'Vittorie %', a: 10, b: null })
  })

  it('lines careers up by year, keeping breaks as gaps and SQ/NC as missing points', () => {
    const a = [season(2001, '10'), season(2002, '2'), season(2005, '1')]
    const b = [season(1994, 'NC'), season(1995, 'SQ'), season(1996, '3', true)]
    const rows = careerPositionRows(a, b)

    expect(rows.map((row) => [row.year, row.a, row.b])).toEqual([
      [1, 10, null],
      [2, 2, null],
      [3, null, 3],
      [4, null, null],
      [5, 1, null],
    ])
    expect(rows[0].seasonB).toEqual({ season: 1994, position: null, label: 'NC', provisional: false })
    expect(rows[2].seasonB?.provisional).toBe(true)
    expect(rows[3].seasonA).toBeNull()
  })

  it('returns no rows without seasons', () => {
    expect(careerPositionRows([], [])).toEqual([])
  })
})

describe('FAMOUS_MATCHUPS', () => {
  it('pairs two different drivers each time', () => {
    expect(FAMOUS_MATCHUPS).toHaveLength(4)
    for (const matchup of FAMOUS_MATCHUPS) expect(matchup.a.driverId).not.toBe(matchup.b.driverId)
  })
})
