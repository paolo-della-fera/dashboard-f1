import type { Driver, JolpicaResponse, MRData, Race, Result } from '../../types/jolpica.ts'

export const JUNE_2026 = Date.UTC(2026, 5, 1)

/** A manual clock: sleeping advances time instantly. */
export function fakeClock(start = JUNE_2026) {
  let time = start
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms
    },
    advance(ms: number) {
      time += ms
    },
  }
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

export function response(
  tables: Partial<MRData>,
  { total, offset = 0, limit = 100 }: { total: number; offset?: number; limit?: number },
): JolpicaResponse {
  return {
    MRData: { limit: String(limit), offset: String(offset), total: String(total), ...tables },
  }
}

export function offsetOf(input: RequestInfo | URL): number {
  return Number(new URL(String(input)).searchParams.get('offset'))
}

export function makeDriver(index: number): Driver {
  return { driverId: `driver${index}`, givenName: 'Driver', familyName: `Number ${index}` }
}

export function makeResult(index: number): Result {
  return {
    position: String(index + 1),
    positionText: String(index + 1),
    points: '0',
    Driver: makeDriver(index),
    Constructor: { constructorId: 'team', name: 'Team' },
  }
}

export function makeRace(season: number, round: number, extra: Partial<Race> = {}): Race {
  return {
    season: String(season),
    round: String(round),
    raceName: `Gran Premio ${round}`,
    date: `${season}-06-01`,
    Circuit: {
      circuitId: `circuit${round}`,
      circuitName: `Circuit ${round}`,
      Location: { lat: '0', long: '0', locality: 'City', country: 'Country' },
    },
    ...extra,
  }
}
