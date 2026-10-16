import { describe, expect, it } from 'vitest'
import { TTL_CURRENT, TTL_CURRENT_EMPTY } from '../../api/cache.ts'
import { createQueryClient, seasonStaleTime } from '../queryClient.ts'

describe('seasonStaleTime', () => {
  it('never refetches concluded seasons', () => {
    expect(seasonStaleTime(1988, 2026)).toBe(Infinity)
    expect(seasonStaleTime(2025, 2026)).toBe(Infinity)
  })

  it('never outlives the client cache for the current season', () => {
    expect(seasonStaleTime(2026, 2026)).toBe(TTL_CURRENT_EMPTY)
    expect(seasonStaleTime('current', 2026)).toBe(TTL_CURRENT_EMPTY)
    expect(seasonStaleTime(2026, 2026)).toBeLessThanOrEqual(TTL_CURRENT)
  })
})

describe('createQueryClient', () => {
  it('leaves retries to the API client and skips focus refetches', () => {
    const defaults = createQueryClient().getDefaultOptions().queries
    expect(defaults?.retry).toBe(false)
    expect(defaults?.refetchOnWindowFocus).toBe(false)
    expect(defaults?.staleTime).toBe(TTL_CURRENT_EMPTY)
  })
})
