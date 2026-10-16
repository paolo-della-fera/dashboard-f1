import { describe, expect, it, vi } from 'vitest'
import { ApiError, isRateLimitError } from '../errors.ts'
import { createRateLimiter, HOUR_MS } from '../rateLimiter.ts'
import { fakeClock } from './fixtures.ts'

describe('createRateLimiter', () => {
  it('starts at most 4 tasks per second, in arrival order', async () => {
    const clock = fakeClock(0)
    const limiter = createRateLimiter({ now: clock.now, sleep: clock.sleep })
    const starts: number[] = []

    await Promise.all(
      Array.from({ length: 10 }, () =>
        limiter.schedule(async () => {
          starts.push(clock.now())
        }),
      ),
    )

    expect(starts).toEqual([0, 0, 0, 0, 1000, 1000, 1000, 1000, 2000, 2000])
  })

  it('waits silently when the hourly limit frees up within 10 seconds', async () => {
    const clock = fakeClock(0)
    const limiter = createRateLimiter({ perSecond: 100, perHour: 5, now: clock.now, sleep: clock.sleep })
    for (let i = 0; i < 5; i++) await limiter.schedule(async () => undefined)

    clock.advance(HOUR_MS - 5000)
    const startedAt = await limiter.schedule(async () => clock.now())

    expect(startedAt).toBe(HOUR_MS)
  })

  it('fails fast with a rate-limit error when the hourly wait exceeds 10 seconds', async () => {
    const clock = fakeClock(0)
    const limiter = createRateLimiter({ perSecond: 100, perHour: 5, now: clock.now, sleep: clock.sleep })
    for (let i = 0; i < 5; i++) await limiter.schedule(async () => undefined)

    clock.advance(1000)
    const task = vi.fn(async () => 'never')
    const error: unknown = await limiter.schedule(task).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(isRateLimitError(error)).toBe(true)
    expect((error as ApiError).retryAfterMs).toBe(HOUR_MS - 1000)
    expect(task).not.toHaveBeenCalled()
    expect(clock.now()).toBe(1000)
  })

  it('applies the default limit of 500 requests per hour', async () => {
    const clock = fakeClock(0)
    const limiter = createRateLimiter({ now: clock.now, sleep: clock.sleep })
    for (let i = 0; i < 500; i++) await limiter.schedule(async () => undefined)

    await expect(limiter.schedule(async () => undefined)).rejects.toMatchObject({ rateLimited: true })
  })

  it('keeps serving requests after a rejected one', async () => {
    const clock = fakeClock(0)
    const limiter = createRateLimiter({ perSecond: 100, perHour: 1, now: clock.now, sleep: clock.sleep })
    await limiter.schedule(async () => undefined)
    await expect(limiter.schedule(async () => undefined)).rejects.toBeInstanceOf(ApiError)

    clock.advance(HOUR_MS)
    await expect(limiter.schedule(async () => 'ok')).resolves.toBe('ok')
  })
})
