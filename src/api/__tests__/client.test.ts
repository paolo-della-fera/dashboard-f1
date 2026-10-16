import { describe, expect, it, vi } from 'vitest'
import { type CacheStore, createMemoryStore, TTL_CURRENT, TTL_CURRENT_EMPTY, TTL_DRIVER } from '../cache.ts'
import { createJolpicaClient, parseRetryAfter } from '../client.ts'
import { ApiError, isRateLimitError } from '../errors.ts'
import { createJolpicaApi } from '../index.ts'
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

  it('builds career standings from one request per season, caching concluded seasons forever', async () => {
    const { api, fetchFn, store, clock } = setup((url) => {
      if (url.pathname.endsWith('/drivers/senna/seasons/')) {
        return json(
          response({ SeasonTable: { Seasons: [{ season: '1984' }, { season: '1988' }] } }, { total: 2 }),
        )
      }
      const season = url.pathname.match(/f1\/(\d{4})\//)?.[1] ?? ''
      const standing = {
        position: season === '1988' ? '1' : '9',
        positionText: '',
        points: '0',
        wins: '0',
        Driver: { driverId: 'senna', givenName: 'Ayrton', familyName: 'Senna' },
        Constructors: [],
      }
      return json(
        response({ StandingsTable: { StandingsLists: [{ season, round: '16', DriverStandings: [standing] }] } }, { total: 1 }),
      )
    })

    const standings = await api.getDriverSeasonStandings('senna')

    expect(standings.map((s) => [s.season, s.DriverStandings?.[0].position])).toEqual([
      ['1984', '9'],
      ['1988', '1'],
    ])
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect((await store.get('v1:1988/drivers/senna/driverStandings/'))?.expiresAt).toBeNull()

    // After the seasons list expires, only that list is downloaded again.
    clock.advance(TTL_DRIVER + MINUTE)
    await api.getDriverSeasonStandings('senna')
    expect(fetchFn).toHaveBeenCalledTimes(4)
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
