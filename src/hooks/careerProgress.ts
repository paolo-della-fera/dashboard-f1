import { useSyncExternalStore } from 'react'
import { createProgressTracker, type Progress, type ProgressTracker } from '../api/index.ts'

// Download progress of each driver's career, kept outside React so it
// survives remounts and the request deduplication of TanStack Query.
const progressByDriver = new Map<string, Progress>()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** A fresh tracker for a new download of the driver's career. */
export function startCareerProgress(driverId: string): ProgressTracker {
  progressByDriver.delete(driverId)
  notify()
  return createProgressTracker((progress) => {
    progressByDriver.set(driverId, progress)
    notify()
  })
}

/** Requests done and expected so far, or null before the first request. */
export function useCareerProgress(driverId: string | null): Progress | null {
  return useSyncExternalStore(subscribe, () => (driverId ? (progressByDriver.get(driverId) ?? null) : null))
}
