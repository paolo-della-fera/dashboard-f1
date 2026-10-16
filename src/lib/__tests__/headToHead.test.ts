import { describe, expect, it } from 'vitest'
import { makeRace } from '../../api/__tests__/fixtures.ts'
import type { QualifyingResult, Race, Result, StandingsList } from '../../types/jolpica.ts'
import { driverStats, headToHead, lastConcludedSeason, type DriverCareer } from '../headToHead.ts'

const TEAMS: Record<string, string> = { mclaren: 'McLaren', ferrari: 'Ferrari', williams: 'Williams', alfa: 'Alfa Romeo' }

interface ResultOptions {
  team?: string
  grid?: string
  position?: string
  fastest?: boolean
}

/** A result row; `text` is the positionText ("1", "R", "D", "W"...). */
function result(driverId: string, text: string, options: ResultOptions = {}): Result {
  const team = options.team ?? 'mclaren'
  return {
    position: options.position ?? (/^\d+$/.test(text) ? text : '20'),
    positionText: text,
    points: '0',
    grid: options.grid ?? '5',
    Driver: { driverId, givenName: 'Given', familyName: driverId },
    Constructor: { constructorId: team, name: TEAMS[team] ?? team },
    ...(options.fastest ? { FastestLap: { rank: '1' } } : {}),
  }
}

function race(season: number, round: number, ...results: Result[]): Race {
  return makeRace(season, round, { Results: results })
}

function quali(season: number, round: number, driverId: string, position: string): Race {
  const entry: QualifyingResult = {
    position,
    Driver: { driverId, givenName: 'Given', familyName: driverId },
    Constructor: { constructorId: 'mclaren', name: 'McLaren' },
  }
  return makeRace(season, round, { QualifyingResults: [entry] })
}

function standing(season: number, driverId: string, positionText: string, points = '10'): StandingsList {
  return {
    season: String(season),
    round: '16',
    DriverStandings: [
      {
        ...(/^\d+$/.test(positionText) ? { position: positionText } : {}),
        positionText,
        points,
        wins: '0',
        Driver: { driverId, givenName: 'Given', familyName: driverId },
        Constructors: [],
      },
    ],
  }
}

function career(driverId: string, results: Race[], qualifying: Race[] = [], standings: StandingsList[] = []): DriverCareer {
  return { driverId, results, qualifying, standings }
}

describe('lastConcludedSeason', () => {
  const schedule = [makeRace(2026, 1, { date: '2026-03-01' }), makeRace(2026, 2, { date: '2026-11-29' })]

  it('is the previous year while the current season is running', () => {
    expect(lastConcludedSeason(2026, schedule, Date.UTC(2026, 9, 16))).toBe(2025)
  })

  it('is the current year once every race has been run', () => {
    expect(lastConcludedSeason(2026, schedule, Date.UTC(2026, 11, 20))).toBe(2026)
  })

  it('is the previous year without a schedule', () => {
    expect(lastConcludedSeason(2026, [], Date.UTC(2026, 11, 20))).toBe(2025)
  })
})

describe('driverStats', () => {
  it('counts only started races and ignores rows of other drivers', () => {
    const stats = driverStats(
      career('senna', [
        race(1988, 1, result('senna', '1'), result('prost', '2')),
        race(1988, 2, result('senna', 'W', { grid: '0' })),
        race(1988, 3, result('senna', 'F', { grid: '0' })),
      ]),
      2025,
    )
    expect(stats.starts).toBe(1)
    expect(stats.wins).toBe(1)
    expect(stats.seasons).toBe(1)
  })

  it('counts a shared drive once, using the best row', () => {
    const stats = driverStats(
      career('fangio', [
        race(1956, 1, result('fangio', 'R', { team: 'ferrari' }), result('fangio', '1', { team: 'ferrari' })),
      ]),
      2025,
    )
    expect(stats.starts).toBe(1)
    expect(stats.wins).toBe(1)
    expect(stats.podiums).toBe(1)
    expect(stats.retirements).toBe(0)
  })

  it('counts wins, podiums and rates over the starts', () => {
    const stats = driverStats(
      career('senna', [
        race(1988, 1, result('senna', '1')),
        race(1988, 2, result('senna', '3')),
        race(1988, 3, result('senna', '4')),
        race(1988, 4, result('senna', 'R')),
      ]),
      2025,
    )
    expect(stats).toMatchObject({ starts: 4, wins: 1, podiums: 2, winRate: 0.25, podiumRate: 0.5 })
  })

  it('counts as retirements only "R": classified with a failure, D, E and N are not', () => {
    const stats = driverStats(
      career('senna', [
        race(1990, 1, result('senna', 'R')),
        race(1990, 2, result('senna', '8')),
        race(1990, 3, result('senna', 'D')),
        race(1990, 4, result('senna', 'E')),
        race(1990, 5, result('senna', 'N')),
      ]),
      2025,
    )
    expect(stats.retirements).toBe(1)
    expect(stats.podiums).toBe(0)
  })

  it('takes the pole from qualifying when available, otherwise from the grid', () => {
    const stats = driverStats(
      career(
        'hamilton',
        [
          race(1990, 1, result('hamilton', '2', { grid: '1' })),
          race(2019, 1, result('hamilton', '1', { grid: '3' })),
          race(2019, 2, result('hamilton', '1', { grid: '1' })),
        ],
        [quali(2019, 1, 'hamilton', '1'), quali(2019, 2, 'hamilton', '2')],
      ),
      2025,
    )
    // 1990: grid 1; 2019/1: pole with a grid penalty; 2019/2: grid 1 inherited from another penalty.
    expect(stats.poles).toBe(2)
  })

  it('takes the pole from the grid on the 2021 sprint weekends', () => {
    const stats = driverStats(
      career(
        'hamilton',
        [race(2021, 10, result('hamilton', '1', { grid: '2' })), race(2021, 11, result('hamilton', '1', { grid: '1' }))],
        [quali(2021, 10, 'hamilton', '1'), quali(2021, 11, 'hamilton', '1')],
      ),
      2025,
    )
    expect(stats.poles).toBe(1)
  })

  it('has no fastest laps before 2004 and marks a partial career', () => {
    expect(driverStats(career('prost', [race(1990, 1, result('prost', '1'))]), 2025).fastestLaps).toBeNull()
    const stats = driverStats(
      career('schumacher', [
        race(2003, 1, result('schumacher', '1')),
        race(2004, 1, result('schumacher', '1', { fastest: true })),
        race(2004, 2, result('schumacher', '2')),
      ]),
      2025,
    )
    expect(stats.fastestLaps).toEqual({ count: 1, coveredStarts: 2, partial: true })
  })

  it('counts titles only in concluded seasons, not when excluded', () => {
    const stats = driverStats(
      career(
        'schumacher',
        [race(1997, 1, result('schumacher', '1')), race(2026, 1, result('schumacher', '1'))],
        [],
        [standing(1994, 'schumacher', '1'), standing(1997, 'schumacher', 'D'), standing(2026, 'schumacher', '1')],
      ),
      2025,
    )
    expect(stats.titles).toEqual([1994])
    expect(stats.bestChampionshipPosition).toEqual({ position: 1, seasons: [1994] })
  })

  it('reports the best championship position with all the seasons it was reached', () => {
    const stats = driverStats(
      career('alesi', [], [], [standing(1996, 'alesi', '4'), standing(1995, 'alesi', '5'), standing(1997, 'alesi', '4')]),
      2025,
    )
    expect(stats.bestChampionshipPosition).toEqual({ position: 4, seasons: [1996, 1997] })
    expect(driverStats(career('nobody', []), 2025).bestChampionshipPosition).toBeNull()
  })

  it('lists teams in order of first appearance and the season-by-season rows', () => {
    const stats = driverStats(
      career(
        'prost',
        [
          race(1989, 1, result('prost', '1', { grid: '1' })),
          race(1990, 1, result('prost', '1', { team: 'ferrari' })),
          race(1990, 2, result('prost', 'R', { team: 'ferrari' })),
          race(2026, 1, result('prost', '3', { team: 'williams' })),
        ],
        [],
        [standing(1989, 'prost', '1', '76'), standing(1990, 'prost', '2', '71'), standing(2026, 'prost', '5', '15')],
      ),
      2025,
    )
    expect(stats.teams.map((team) => [team.name, team.seasons])).toEqual([
      ['McLaren', [1989]],
      ['Ferrari', [1990]],
      ['Williams', [2026]],
    ])
    expect(stats.seasonBySeason).toEqual([
      { season: 1989, teams: ['McLaren'], starts: 1, wins: 1, podiums: 1, poles: 1, position: '1', points: 76, provisional: false },
      { season: 1990, teams: ['Ferrari'], starts: 2, wins: 1, podiums: 1, poles: 0, position: '2', points: 71, provisional: false },
      { season: 2026, teams: ['Williams'], starts: 1, wins: 0, podiums: 1, poles: 0, position: '5', points: 15, provisional: true },
    ])
  })

  it('handles a driver with no data', () => {
    expect(driverStats(career('nobody', []), 2025)).toMatchObject({
      starts: 0,
      winRate: null,
      podiumRate: null,
      poleRate: null,
      fastestLaps: null,
      titles: [],
      teams: [],
      seasonBySeason: [],
    })
  })

  it('shows "SQ" with the official points for an excluded season', () => {
    const stats = driverStats(
      career('schumacher', [race(1997, 1, result('schumacher', '1'))], [], [standing(1997, 'schumacher', 'D', '78')]),
      2025,
    )
    expect(stats.seasonBySeason[0]).toMatchObject({ position: 'SQ', points: 78 })
  })

  it('shows "NC" for a season listed without a position and "—" without standings', () => {
    const stats = driverStats(
      career(
        'senna',
        [race(1994, 1, result('senna', 'R')), race(1995, 1, result('senna', 'R'))],
        [],
        [standing(1994, 'senna', '-', '0')],
      ),
      2025,
    )
    expect(stats.seasonBySeason.map((season) => season.position)).toEqual(['NC', '—'])
    expect(stats.seasonBySeason[1].points).toBeNull()
  })
})

describe('headToHead', () => {
  it('compares only the races both drivers started', () => {
    const a = career('senna', [
      race(1988, 1, result('senna', '1')),
      race(1988, 2, result('senna', '1')),
      race(1988, 3, result('senna', '1')),
    ])
    const b = career('prost', [race(1988, 1, result('prost', '2')), race(1988, 2, result('prost', 'W'))])
    const comparison = headToHead(a, b)
    expect(comparison.racesTogether).toBe(1)
    expect(comparison.race).toEqual({ aAhead: 1, bAhead: 0, bothUnclassified: 0 })
  })

  it('puts the classified driver ahead and skips races where neither is classified', () => {
    const a = career('senna', [
      race(1989, 1, result('senna', 'R')),
      race(1989, 2, result('senna', 'R')),
      race(1989, 3, result('senna', 'D')),
      race(1989, 4, result('senna', '5')),
    ])
    const b = career('prost', [
      race(1989, 1, result('prost', '7')),
      race(1989, 2, result('prost', 'R')),
      race(1989, 3, result('prost', '1')),
      race(1989, 4, result('prost', '3')),
    ])
    expect(headToHead(a, b).race).toEqual({ aAhead: 0, bAhead: 3, bothUnclassified: 1 })
  })

  it('compares qualifying positions, falling back to the grid without qualifying data', () => {
    const a = career(
      'senna',
      [
        race(1988, 1, result('senna', '1', { grid: '1' })),
        race(1994, 1, result('senna', 'R', { grid: '1' })),
        race(1994, 2, result('senna', 'R', { grid: '0' })),
      ],
      [quali(1994, 1, 'senna', '1')],
    )
    const b = career(
      'prost',
      [
        race(1988, 1, result('prost', '2', { grid: '2' })),
        race(1994, 1, result('prost', '1', { grid: '2' })),
        race(1994, 2, result('prost', '1', { grid: '3' })),
      ],
      [quali(1994, 1, 'prost', '2')],
    )
    // 1994/2: no qualifying data and a pit-lane start: not counted.
    expect(headToHead(a, b).qualifying).toEqual({ aAhead: 2, bAhead: 0, fromGrid: 1 })
  })

  it('restricts the teammate comparison to races with a shared team, also after a mid-season switch', () => {
    const a = career(
      'senna',
      [
        race(1989, 1, result('senna', '1')),
        race(1989, 2, result('senna', '2')),
        race(1990, 1, result('senna', '1')),
      ],
      [],
      [standing(1989, 'senna', '2', '60'), standing(1990, 'senna', '1', '78')],
    )
    const b = career(
      'prost',
      [
        race(1989, 1, result('prost', '2')),
        race(1989, 2, result('prost', '1', { team: 'ferrari' })),
        race(1990, 1, result('prost', '3', { team: 'ferrari' })),
      ],
      [],
      [standing(1989, 'prost', '1', '76'), standing(1990, 'prost', '2', '71')],
    )
    const comparison = headToHead(a, b)
    expect(comparison.racesTogether).toBe(3)
    expect(comparison.race).toEqual({ aAhead: 2, bAhead: 1, bothUnclassified: 0 })
    expect(comparison.teammates).toEqual({
      races: 1,
      seasons: [
        {
          season: 1989,
          teams: ['McLaren'],
          races: 1,
          a: { position: '2', points: 60 },
          b: { position: '1', points: 76 },
        },
      ],
      race: { aAhead: 1, bAhead: 0, bothUnclassified: 0 },
      qualifying: { aAhead: 0, bAhead: 0, fromGrid: 1 },
    })
  })

  it('counts a shared team from any row of a shared drive', () => {
    const a = career('fangio', [
      race(1951, 1, result('fangio', '1', { team: 'alfa' }), result('fangio', 'R', { team: 'ferrari' })),
    ])
    const b = career('ascari', [race(1951, 1, result('ascari', '2', { team: 'ferrari' }))])
    expect(headToHead(a, b).teammates?.races).toBe(1)
  })

  it('returns empty counts for drivers who never raced together', () => {
    const a = career('fangio', [race(1955, 1, result('fangio', '1'))])
    const b = career('verstappen', [race(2023, 1, result('verstappen', '1'))])
    expect(headToHead(a, b)).toEqual({
      racesTogether: 0,
      race: { aAhead: 0, bAhead: 0, bothUnclassified: 0 },
      qualifying: { aAhead: 0, bAhead: 0, fromGrid: 0 },
      teammates: null,
    })
  })
})
