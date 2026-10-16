import { QueryClient } from '@tanstack/react-query'
import { TTL_CURRENT_EMPTY, ttlFor } from '../api/cache.ts'
import type { Season } from '../types/jolpica.ts'

/**
 * The API client cache (IndexedDB) decides when data is really stale; the
 * TanStack layer only keeps it in memory and must never hold it longer than
 * the client TTL. A refetch after staleTime is cheap: it reads IndexedDB and
 * only hits the network when the client entry has expired.
 */
export const DEFAULT_STALE_TIME = TTL_CURRENT_EMPTY

/**
 * Concluded seasons never change (Infinity); the current season uses the
 * shortest TTL the client can assign to it, so memory never outlives the cache.
 */
export function seasonStaleTime(season: Season, currentYear: number): number {
  return ttlFor(season, currentYear, true) ?? Infinity
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        // The API client already retries 429, 5xx and network errors.
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  })
}
