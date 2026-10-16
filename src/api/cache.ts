import type { Season } from '../types/jolpica.ts'

export const TTL_CURRENT = 6 * 60 * 60 * 1000
export const TTL_CURRENT_EMPTY = 30 * 60 * 1000
export const TTL_DRIVER = 24 * 60 * 60 * 1000

export interface CacheEntry {
  data: unknown
  savedAt: number
  /** null means the entry never expires. */
  expiresAt: number | null
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined>
  set(key: string, entry: CacheEntry): Promise<void>
}

/**
 * Time to live for season-based data: concluded seasons never change, the
 * current one is refreshed every few hours, and sooner when still empty
 * (e.g. results not published yet).
 */
export function ttlFor(season: Season, currentYear: number, isEmpty: boolean): number | null {
  if (season !== 'current' && season < currentYear) return null
  return isEmpty ? TTL_CURRENT_EMPTY : TTL_CURRENT
}

export function isFresh(entry: CacheEntry, now: number): boolean {
  return entry.expiresAt === null || entry.expiresAt > now
}

export function createMemoryStore(): CacheStore {
  const entries = new Map<string, CacheEntry>()
  return {
    async get(key) {
      return entries.get(key)
    },
    async set(key, entry) {
      entries.set(key, entry)
    },
  }
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Persistent store backed by IndexedDB. Falls back to memory when IndexedDB
 * is unavailable (private browsing, tests) or fails.
 */
export function createIndexedDbStore(dbName = 'dashboard-f1', storeName = 'responses'): CacheStore {
  const memory = createMemoryStore()
  let dbPromise: Promise<IDBDatabase | null> | undefined

  function openDb(): Promise<IDBDatabase | null> {
    dbPromise ??= new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null)
        return
      }
      try {
        const request = indexedDB.open(dbName, 1)
        request.onupgradeneeded = () => {
          request.result.createObjectStore(storeName)
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(null)
        request.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
    return dbPromise
  }

  return {
    async get(key) {
      const db = await openDb()
      if (!db) return memory.get(key)
      try {
        const store = db.transaction(storeName, 'readonly').objectStore(storeName)
        return (await promisify(store.get(key))) as CacheEntry | undefined
      } catch {
        return memory.get(key)
      }
    },
    async set(key, entry) {
      const db = await openDb()
      if (!db) return memory.set(key, entry)
      try {
        const store = db.transaction(storeName, 'readwrite').objectStore(storeName)
        await promisify(store.put(entry, key))
      } catch {
        await memory.set(key, entry)
      }
    },
  }
}
