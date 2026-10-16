import { describe, expect, it, vi } from 'vitest'
import { type CacheStore, createMemoryStore, TTL_CURRENT, TTL_CURRENT_EMPTY, TTL_DRIVER } from '../cache.ts'
import { createJolpicaClient, parseRetryAfter } from '../client.ts'
import { ApiError, isRateLimitError } from '../errors.ts'
import { createJolpicaApi } from '../index.ts'
import { createProgressTracker } from '../progress.ts'
import { createRateLimiter } from '../rateLimiter.ts'
import {
  fakeClock,
  json,
  makeDriver,
  makeRace,
  makeResult,
  offsetOf,
  response,
} from './fixtures.ts'

const MINUTE = 60 * 1000

function setup(
  handler: (url: URL) => Response | Promise<Response>,
  options: { store?: CacheStore; perHour?: number } = {},
) {
  const clock = fakeClock()
  const fetchFn = vi.fn<typeof fetch>(async (input) => handler(new URL(String(input))))
  const store = options.store ?? createMemoryStore()
  const limiter = createRateLimiter({ now: clock.now, sleep: clock.sleep, perHour: options.perHour })
  const client = createJolpicaClient({ fetchFn, store, limiter, now: clock.now, sleep: clock.sleep })
  return { clock, fetchFn, store, client, api: createJolpicaApi(client) }
}

function oneRace(season = 2024) {
  return () => json(response({ RaceTable: { Races: [makeRace(season, 1)] } }, { total: 1 }))
}

function noRaces() {
  return json(response({ RaceTable: { Races: [] } }, { total: 0 }))
}

function careerStandingsHandler(
  driverSeasons: Record<string, string[]>,
  classified: Record<string, string[]> = driverSeasons,
) {
  return (url: URL) => {
    const driver = url.pathname.match(/\/drivers\/(\w+)\/seasons\/$/)?.[1]
    if (driver) {
      const seasons = (driverSeasons[driver] ?? []).map((season) => ({ season }))
      return json(response({ SeasonTable: { Seasons: seasons } }, { total: seasons.length }))
    }
    const season = url.pathname.match(/f1\/(\d{4})\/driverStandings\/$/)?.[1] ?? ''
    const rows = Object.entries(classified)
      .filter(([, seasons]) => seasons.includes(season))
      .map(([driverId], index) => ({
        position: season === '1988' && driverId === 'senna' ? '1' : String(index + 9),
        positionText: '',
        points: '0',
        wins: '0',
        Driver: { driverId, givenName: 'Nome', familyName: driverId },
        Constructors: [],
      }))
    return json(
      response({ StandingsTable: { StandingsLists: [{ season, round: '16', DriverStandings: rows }] } }, { total: rows.length }),
    )
  }
}

describe('pagination', () => {
  it('downloads every page until total is reached', async () => {
    const all = Array.from({ length: 250 }, (_, i) => makeDriver(i))
    const { api, fetchFn } = setup((url) => {
      const offset = offsetOf(url)
      return json(
        response({ DriverTable: { Drivers: all.slice(offset, offset + 100) } }, { total: 250, offset }),
      )
    })

    const drivers = await api.getAllDrivers()

    expect(drivers).toHaveLength(250)
    expect(drivers[249].driverId).toBe('driver249')
    expect(fetchFn.mock.calls.map(([input]) => offsetOf(input))).toEqual([0, 100, 200])
    expect(String(fetchFn.mock.calls[0][0])).toBe('https://api.jolpi.ca/ergast/f1/drivers/?limit=100&offset=0')
  })

  it('joins a race whose results are split across pages', async () => {
    const results = Array.from({ length: 110 }, (_, i) => makeResult(i))
    const { api } = setup((url) => {
      const races =
        offsetOf(url) === 0
          ? [makeRace(2024, 1, { Results: results.slice(0, 100) })]
          : [
              makeRace(2024, 1, { Results: results.slice(100) }),
              makeRace(2024, 2, { Results: [makeResult(0)] }),
            ]
      return json(response({ RaceTable: { Races: races } }, { total: 111, offset: offsetOf(url) }))
    })

    const season = await api.getSeasonResults(2024)

    expect(season).toHaveLength(2)
    expect(season[0].Results).toHaveLength(110)
  })

  it('makes a single request when everything fits in one page', async () => {
    const { api, fetchFn } = setup(oneRace())
    await api.getSchedule(2024)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})

describe('cache', () => {
  it('serves repeated requests from the cache', async () => {
    const { api, fetchFn } = setup(oneRace())

    const first = await api.getSchedule(2024)
    const second = await api.getSchedule(2024)

    expect(second).toEqual(first)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('reuses data saved by a previous session in the same store', async () => {
    const store = createMemoryStore()
    await setup(oneRace(), { store }).api.getSchedule(2024)

    const { api, fetchFn } = setup(oneRace(), { store })
    await api.getSchedule(2024)

    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('never expires concluded seasons', async () => {
    const { api, fetchFn, clock } = setup(oneRace(1988))
    await api.getSchedule(1988)

    clock.advance(10 * 365 * 24 * 60 * MINUTE)
    await api.getSchedule(1988)

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('expires the current season after 6 hours', async () => {
    const { api, fetchFn, clock } = setup(oneRace(2026))
    await api.getSchedule(2026)

    clock.advance(TTL_CURRENT - MINUTE)
    await api.getSchedule(2026)
    expect(fetchFn).toHaveBeenCalledTimes(1)

    clock.advance(2 * MINUTE)
    await api.getSchedule(2026)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('expires an empty current-season response after 30 minutes', async () => {
    const { api, fetchFn, clock } = setup(noRaces)
    expect(await api.getRaceResults(2026, 20)).toBeNull()

    clock.advance(29 * MINUTE)
    await api.getRaceResults(2026, 20)
    expect(fetchFn).toHaveBeenCalledTimes(1)

    clock.advance(2 * MINUTE)
    await api.getRaceResults(2026, 20)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(TTL_CURRENT_EMPTY).toBe(30 * MINUTE)
  })

  it('treats empty arrays as empty for the "current" season too', async () => {
    const { api, store } = setup(noRaces)
    await api.getSeasonResults('current')

    const entry = await store.get('v1:current/results/')
    expect(entry?.expiresAt).toBe((entry?.savedAt ?? 0) + TTL_CURRENT_EMPTY)
  })

  it('keeps empty data of concluded seasons forever (e.g. no sprint in 1988)', async () => {
    const { api, store } = setup(noRaces)
    expect(await api.getSprint(1988, 3)).toBeNull()

    expect((await store.get('v1:1988/3/sprint/'))?.expiresAt).toBeNull()
  })

  it('caches driver data for 24 hours', async () => {
    const { api, store } = setup(() =>
      json(response({ RaceTable: { Races: [makeRace(2007, 1, { Results: [makeResult(0)] })] } }, { total: 1 })),
    )
    await api.getDriverResults('hamilton')

    const entry = await store.get('v1:drivers/hamilton/results/')
    expect(entry?.expiresAt).toBe((entry?.savedAt ?? 0) + TTL_DRIVER)
  })

  it('builds career standings from the full standings of each season, caching concluded seasons forever', async () => {
    const { api, fetchFn, store, clock } = setup(careerStandingsHandler({ senna: ['1984', '1988'] }))

    const standings = await api.getDriverSeasonStandings('senna')

    expect(standings.map((s) => [s.season, s.DriverStandings?.map((d) => [d.Driver.driverId, d.position])])).toEqual([
      ['1984', [['senna', '9']]],
      ['1988', [['senna', '1']]],
    ])
    expect(fetchFn.mock.calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      '/ergast/f1/drivers/senna/seasons/',
      '/ergast/f1/1984/driverStandings/',
      '/ergast/f1/1988/driverStandings/',
    ])
    expect((await store.get('v1:1988/driverStandings/'))?.expiresAt).toBeNull()

    // After the seasons list expires, only that list is downloaded again.
    clock.advance(TTL_DRIVER + MINUTE)
    await api.getDriverSeasonStandings('senna')
    expect(fetchFn).toHaveBeenCalledTimes(4)
  })

  it('shares season standings between drivers and with getDriverStandings', async () => {
    const { api, fetchFn } = setup(careerStandingsHandler({ senna: ['1984', '1988'], prost: ['1980', '1984', '1988'] }))

    await api.getDriverSeasonStandings('senna')
    const prost = await api.getDriverSeasonStandings('prost')
    const season1988 = await api.getDriverStandings(1988)

    expect(prost.map((s) => [s.season, s.DriverStandings?.[0].Driver.driverId])).toEqual([
      ['1980', 'prost'],
      ['1984', 'prost'],
      ['1988', 'prost'],
    ])
    expect(season1988.map((d) => d.Driver.driverId)).toEqual(['senna', 'prost'])
    // Two seasons lists, 1984 and 1988 once each, 1980 for Prost only.
    expect(fetchFn).toHaveBeenCalledTimes(5)
  })

  it('skips seasons whose standings do not include the driver', async () => {
    const { api } = setup(careerStandingsHandler({ senna: ['1984', '1988'] }, { senna: ['1988'] }))

    const standings = await api.getDriverSeasonStandings('senna')

    expect(standings.map((s) => s.season)).toEqual(['1988'])
  })

  it('makes one request for identical simultaneous calls', async () => {
    const { api, fetchFn } = setup(oneRace())

    const [a, b] = await Promise.all([api.getSchedule(2024), api.getSchedule(2024)])

    expect(a).toEqual(b)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('still returns data when the store fails', async () => {
    const broken: CacheStore = {
      get: () => Promise.reject(new Error('broken')),
      set: () => Promise.reject(new Error('broken')),
    }
    const { api } = setup(oneRace(), { store: broken })
    await expect(api.getSchedule(2024)).resolves.toHaveLength(1)
  })
})

describe('error handling', () => {
  it('retries after HTTP 429 respecting Retry-After', async () => {
    let calls = 0
    const { api, fetchFn, clock } = setup(() => {
      calls++
      return calls === 1
        ? new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '2' } })
        : oneRace()()
    })
    const start = clock.now()

    await expect(api.getSchedule(2024)).resolves.toHaveLength(1)

    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(clock.now() - start).toBeGreaterThanOrEqual(2000)
  })

  it('fails fast with a rate-limit error when Retry-After is too long', async () => {
    const { api, fetchFn } = setup(
      () => new Response('', { status: 429, headers: { 'Retry-After': '3600' } }),
    )

    const error: unknown = await api.getSchedule(2024).catch((e: unknown) => e)

    expect(isRateLimitError(error)).toBe(true)
    expect((error as ApiError).retryAfterMs).toBe(3_600_000)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('gives up with an ApiError after 3 retries on server errors', async () => {
    const { api, fetchFn } = setup(() => new Response('', { status: 503 }))

    const error: unknown = await api.getSchedule(2024).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(503)
    expect((error as ApiError).rateLimited).toBe(false)
    expect(fetchFn).toHaveBeenCalledTimes(4)
  })

  it('does not retry on HTTP 404', async () => {
    const { api, fetchFn } = setup(() => new Response('', { status: 404 }))

    await expect(api.getDriverResults('nobody')).rejects.toMatchObject({ status: 404, rateLimited: false })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('retries after a network error', async () => {
    let calls = 0
    const { api, fetchFn } = setup(() => {
      calls++
      if (calls === 1) throw new TypeError('Failed to fetch')
      return oneRace()()
    })

    await expect(api.getSchedule(2024)).resolves.toHaveLength(1)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('reports the hourly limit as a rate-limit error without calling the API', async () => {
    const { api, fetchFn } = setup(oneRace(), { perHour: 1 })
    await api.getSchedule(2024)

    const error: unknown = await api.getSchedule(2023).catch((e: unknown) => e)

    expect(isRateLimitError(error)).toBe(true)
    expect((error as ApiError).url).toContain('2023/races/')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('does not cache failed requests', async () => {
    let fail = true
    const { api, fetchFn } = setup(() => (fail ? new Response('', { status: 404 }) : oneRace()()))
    await expect(api.getSchedule(2024)).rejects.toBeInstanceOf(ApiError)

    fail = false
    await expect(api.getSchedule(2024)).resolves.toHaveLength(1)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})

describe('parseRetryAfter', () => {
  it('reads seconds and HTTP dates', () => {
    expect(parseRetryAfter('5', 0)).toBe(5000)
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4000)).toBe(6000)
    expect(parseRetryAfter(null, 0)).toBeUndefined()
    expect(parseRetryAfter('soon', 0)).toBeUndefined()
  })
})

describe('standings after a round', () => {
  function standingsHandler(url: URL) {
    const [, season, round] = url.pathname.match(/f1\/(\d{4})\/(\d+)\//) ?? []
    return json(
      response(
        {
          StandingsTable: {
            StandingsLists: [
              {
                season,
                round,
                DriverStandings: [
                  {
                    position: '1',
                    positionText: '1',
                    points: round,
                    wins: '0',
                    Driver: makeDriver(1),
                    Constructors: [],
                  },
                ],
                ConstructorStandings: [
                  {
                    position: '1',
                    positionText: '1',
                    points: round,
                    wins: '0',
                    Constructor: { constructorId: 'team', name: 'Team' },
                  },
                ],
              },
            ],
          },
        },
        { total: 1 },
      ),
    )
  }

  it('reads driver standings of a given round and caches concluded seasons forever', async () => {
    const { api, fetchFn, store } = setup(standingsHandler)

    const standings = await api.getDriverStandingsAfterRound(1988, 7)

    expect(standings[0].points).toBe('7')
    expect(new URL(String(fetchFn.mock.calls[0][0])).pathname).toMatch(/\/f1\/1988\/7\/driverStandings\/$/)
    expect((await store.get('v1:1988/7/driverStandings/'))?.expiresAt).toBeNull()
  })

  it('reads constructor standings of a given round', async () => {
    const { api, fetchFn } = setup(standingsHandler)

    const standings = await api.getConstructorStandingsAfterRound(2026, 3)

    expect(standings[0].points).toBe('3')
    expect(new URL(String(fetchFn.mock.calls[0][0])).pathname).toMatch(
      /\/f1\/2026\/3\/constructorStandings\/$/,
    )
  })

  it('returns an empty list when the round has no standings yet', async () => {
    const { api } = setup(() =>
      json(response({ StandingsTable: { StandingsLists: [] } }, { total: 0 })),
    )
    expect(await api.getDriverStandingsAfterRound(2026, 20)).toEqual([])
  })
})

describe('progress', () => {
  function recorder() {
    const events: Array<{ done: number; total: number }> = []
    return { events, tracker: createProgressTracker((progress) => events.push(progress)) }
  }

  function careerPages(total: number) {
    return (url: URL) => {
      const offset = offsetOf(url)
      const count = Math.min(100, total - offset)
      const races = Array.from({ length: count }, (_, i) => makeRace(2000 + Math.floor((offset + i) / 20), ((offset + i) % 20) + 1))
      return json(response({ RaceTable: { Races: races } }, { total, offset }))
    }
  }

  it('counts every page of a paginated download', async () => {
    const { api, fetchFn } = setup(careerPages(250))
    const { events, tracker } = recorder()

    const races = await api.getDriverResults('hamilton', tracker)

    expect(races).toHaveLength(250)
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(events[0]).toEqual({ done: 0, total: 1 })
    expect(events.at(-1)).toEqual({ done: 3, total: 3 })
  })

  it('returns the same data with or without a tracker', async () => {
    const withTracker = await setup(careerPages(150)).api.getDriverQualifying('hamilton', recorder().tracker)
    const without = await setup(careerPages(150)).api.getDriverQualifying('hamilton')
    expect(withTracker).toEqual(without)
  })

  it('reports nothing for data already in the cache', async () => {
    const { api, fetchFn } = setup(careerPages(50))
    await api.getDriverResults('hamilton')
    const { events, tracker } = recorder()

    await api.getDriverResults('hamilton', tracker)

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(events).toEqual([])
  })

  it('counts the seasons list and one standing per season', async () => {
    const { api } = setup((url) => {
      if (url.pathname.endsWith('/drivers/senna/seasons/')) {
        return json(
          response({ SeasonTable: { Seasons: [{ season: '1984' }, { season: '1985' }, { season: '1988' }] } }, { total: 3 }),
        )
      }
      const season = url.pathname.match(/f1\/(\d{4})\//)?.[1] ?? ''
      return json(response({ StandingsTable: { StandingsLists: [{ season, round: '16', DriverStandings: [] }] } }, { total: 1 }))
    })
    const { events, tracker } = recorder()

    await api.getDriverSeasonStandings('senna', tracker)

    expect(events.at(-1)).toEqual({ done: 4, total: 4 })
  })
})
