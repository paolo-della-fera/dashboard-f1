import type { JolpicaResponse, MRData } from '../types/jolpica.ts'
import { type CacheStore, createIndexedDbStore, isFresh } from './cache.ts'
import { ApiError } from './errors.ts'
import type { ProgressTracker } from './progress.ts'
import { createRateLimiter, defaultSleep, type RateLimiter } from './rateLimiter.ts'

export const BASE_URL = 'https://api.jolpi.ca/ergast/f1/'
export const PAGE_SIZE = 100
export const CACHE_VERSION = 'v1'

export interface JolpicaClientOptions {
  fetchFn?: typeof fetch
  store?: CacheStore
  limiter?: RateLimiter
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  baseUrl?: string
  /** Retries after the first attempt for 429, 5xx and network errors. */
  maxRetries?: number
  /** Server-requested waits longer than this fail fast instead of blocking. */
  maxWaitMs?: number
}

export interface JolpicaClient {
  currentYear(): number
  fetchJson(url: string): Promise<JolpicaResponse>
  fetchAll<T>(
    path: string,
    extract: (data: MRData) => T[],
    merge?: (items: T[]) => T[],
    progress?: ProgressTracker,
  ): Promise<T[]>
  cached<T>(key: string, ttl: (data: T) => number | null, loader: () => Promise<T>): Promise<T>
}

export function parseRetryAfter(header: string | null, now: number): number | undefined {
  if (!header) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(header)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, date - now)
}

export function createJolpicaClient(options: JolpicaClientOptions = {}): JolpicaClient {
  const fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init))
  const store = options.store ?? createIndexedDbStore()
  const limiter = options.limiter ?? createRateLimiter()
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep
  const baseUrl = options.baseUrl ?? BASE_URL
  const maxRetries = options.maxRetries ?? 3
  const maxWaitMs = options.maxWaitMs ?? 10_000

  const inflight = new Map<string, Promise<unknown>>()

  function backoff(attempt: number): number {
    return 1000 * 2 ** attempt
  }

  async function fetchJson(url: string): Promise<JolpicaResponse> {
    for (let attempt = 0; ; attempt++) {
      let response: Response
      try {
        response = await limiter.schedule(() => fetchFn(url))
      } catch (error) {
        if (error instanceof ApiError) {
          throw new ApiError(`${error.message} (${url})`, {
            url,
            rateLimited: error.rateLimited,
            retryAfterMs: error.retryAfterMs,
            cause: error,
          })
        }
        if (attempt >= maxRetries) {
          throw new ApiError(`Network error for ${url}`, { url, cause: error })
        }
        await sleep(backoff(attempt))
        continue
      }

      if (response.ok) {
        try {
          return (await response.json()) as JolpicaResponse
        } catch (error) {
          throw new ApiError(`Invalid JSON from ${url}`, { url, status: response.status, cause: error })
        }
      }

      const { status } = response
      if (status !== 429 && status < 500) {
        throw new ApiError(`HTTP ${status} for ${url}`, { url, status })
      }
      const wait =
        status === 429
          ? (parseRetryAfter(response.headers.get('Retry-After'), now()) ?? backoff(attempt))
          : backoff(attempt)
      if (attempt >= maxRetries || wait > maxWaitMs) {
        throw new ApiError(`HTTP ${status} for ${url}`, {
          url,
          status,
          rateLimited: status === 429,
          retryAfterMs: status === 429 ? wait : undefined,
        })
      }
      await sleep(wait)
    }
  }

  function pageUrl(path: string, offset: number): string {
    return `${baseUrl}${path}?limit=${PAGE_SIZE}&offset=${offset}`
  }

  async function fetchAll<T>(
    path: string,
    extract: (data: MRData) => T[],
    merge: (items: T[]) => T[] = (items) => items,
    progress?: ProgressTracker,
  ): Promise<T[]> {
    progress?.expect(1)
    const first = (await fetchJson(pageUrl(path, 0))).MRData
    progress?.complete(1)
    const total = Number(first.total) || 0
    const step = Number(first.limit) || PAGE_SIZE

    // Remaining pages are requested together; the rate limiter spaces them out.
    const offsets: number[] = []
    for (let offset = step; offset < total; offset += step) offsets.push(offset)
    progress?.expect(offsets.length)
    const rest = await Promise.all(
      offsets.map(async (offset) => {
        const page = await fetchJson(pageUrl(path, offset))
        progress?.complete(1)
        return page
      }),
    )

    const items = [first, ...rest.map((page) => page.MRData)].flatMap(extract)
    return merge(items)
  }

  async function readCache(key: string) {
    try {
      return await store.get(key)
    } catch {
      return undefined
    }
  }

  async function writeCache(key: string, data: unknown, ttlMs: number | null) {
    const savedAt = now()
    try {
      await store.set(key, { data, savedAt, expiresAt: ttlMs === null ? null : savedAt + ttlMs })
    } catch {
      // A failed cache write must not fail the request.
    }
  }

  async function cached<T>(
    key: string,
    ttl: (data: T) => number | null,
    loader: () => Promise<T>,
  ): Promise<T> {
    const fullKey = `${CACHE_VERSION}:${key}`
    const pending = inflight.get(fullKey)
    if (pending) return pending as Promise<T>

    const promise = (async () => {
      const entry = await readCache(fullKey)
      if (entry && isFresh(entry, now())) return entry.data as T
      const data = await loader()
      await writeCache(fullKey, data, ttl(data))
      return data
    })()

    inflight.set(fullKey, promise)
    try {
      return await promise
    } finally {
      inflight.delete(fullKey)
    }
  }

  return {
    currentYear: () => new Date(now()).getFullYear(),
    fetchJson,
    fetchAll,
    cached,
  }
}
