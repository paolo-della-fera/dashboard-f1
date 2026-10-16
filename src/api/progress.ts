export interface Progress {
  done: number
  total: number
}

/**
 * Counts network requests of a long download. `total` grows while the work is
 * discovered (more pages after the first response, one standing per season).
 */
export interface ProgressTracker {
  expect(count: number): void
  complete(count: number): void
}

export function createProgressTracker(onChange: (progress: Progress) => void): ProgressTracker {
  let done = 0
  let total = 0
  return {
    expect(count) {
      if (count <= 0) return
      total += count
      onChange({ done, total })
    },
    complete(count) {
      if (count <= 0) return
      done = Math.min(total, done + count)
      onChange({ done, total })
    },
  }
}
