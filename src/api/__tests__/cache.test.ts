import { describe, expect, it } from 'vitest'
import {
  createIndexedDbStore,
  createMemoryStore,
  isFresh,
  TTL_CURRENT,
  TTL_CURRENT_EMPTY,
  ttlFor,
} from '../cache.ts'

describe('ttlFor', () => {
  it('never expires concluded seasons, even when empty', () => {
    expect(ttlFor(1988, 2026, false)).toBeNull()
    expect(ttlFor(1988, 2026, true)).toBeNull()
  })

  it('expires the current season after 6 hours', () => {
    expect(ttlFor(2026, 2026, false)).toBe(TTL_CURRENT)
    expect(ttlFor('current', 2026, false)).toBe(TTL_CURRENT)
  })

  it('expires empty current-season data after 30 minutes', () => {
    expect(ttlFor(2026, 2026, true)).toBe(TTL_CURRENT_EMPTY)
    expect(ttlFor('current', 2026, true)).toBe(TTL_CURRENT_EMPTY)
  })
})

describe('isFresh', () => {
  it('treats entries without expiry as always fresh', () => {
    expect(isFresh({ data: 1, savedAt: 0, expiresAt: null }, Number.MAX_SAFE_INTEGER)).toBe(true)
  })

  it('compares the expiry with the current time', () => {
    const entry = { data: 1, savedAt: 0, expiresAt: 100 }
    expect(isFresh(entry, 99)).toBe(true)
    expect(isFresh(entry, 100)).toBe(false)
  })
})

describe('stores', () => {
  it('memory store saves and reads entries', async () => {
    const store = createMemoryStore()
    await store.set('a', { data: [1, 2], savedAt: 0, expiresAt: null })
    expect(await store.get('a')).toEqual({ data: [1, 2], savedAt: 0, expiresAt: null })
    expect(await store.get('missing')).toBeUndefined()
  })

  it('IndexedDB store falls back to memory when IndexedDB is unavailable', async () => {
    const store = createIndexedDbStore()
    await store.set('a', { data: 'x', savedAt: 0, expiresAt: null })
    expect((await store.get('a'))?.data).toBe('x')
  })
})
