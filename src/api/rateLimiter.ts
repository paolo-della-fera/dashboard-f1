import { ApiError } from './errors.ts'

export const SECOND_MS = 1000
export const HOUR_MS = 60 * 60 * 1000

export interface RateLimiterOptions {
  perSecond?: number
  perHour?: number
  /** Longer hourly waits fail fast with a rate-limit ApiError instead of blocking. */
  maxWaitMs?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

export interface RateLimiter {
  schedule<T>(task: () => Promise<T>): Promise<T>
}

export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Lets tasks start in arrival order while respecting both a per-second and a
 * per-hour limit (sliding windows over start times). Tasks themselves run
 * concurrently: only their start is queued.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const perSecond = options.perSecond ?? 4
  const perHour = options.perHour ?? 500
  const maxWaitMs = options.maxWaitMs ?? 10_000
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep

  // Start times within the last hour, oldest first.
  const starts: number[] = []
  let tail: Promise<void> = Promise.resolve()

  function prune(time: number) {
    while (starts.length > 0 && starts[0] <= time - HOUR_MS) starts.shift()
  }

  async function acquireSlot() {
    for (;;) {
      const time = now()
      prune(time)
      const hourWait = starts.length >= perHour ? starts[starts.length - perHour] + HOUR_MS - time : 0
      if (hourWait > maxWaitMs) {
        throw new ApiError('Hourly request limit reached', {
          rateLimited: true,
          retryAfterMs: hourWait,
        })
      }
      const secondWait =
        starts.length >= perSecond ? starts[starts.length - perSecond] + SECOND_MS - time : 0
      const wait = Math.max(hourWait, secondWait)
      if (wait <= 0) break
      await sleep(wait)
    }
    starts.push(now())
  }

  return {
    async schedule<T>(task: () => Promise<T>): Promise<T> {
      const slot = tail.then(acquireSlot)
      tail = slot.catch(() => undefined)
      await slot
      return task()
    },
  }
}
