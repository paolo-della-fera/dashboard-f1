import { describe, expect, it, vi } from 'vitest'
import { createProgressTracker } from '../progress.ts'

describe('createProgressTracker', () => {
  it('reports expected and completed requests as they change', () => {
    const onChange = vi.fn()
    const tracker = createProgressTracker(onChange)

    tracker.expect(3)
    tracker.complete(1)
    tracker.expect(2)
    tracker.complete(1)

    expect(onChange.mock.calls.map(([progress]) => progress)).toEqual([
      { done: 0, total: 3 },
      { done: 1, total: 3 },
      { done: 1, total: 5 },
      { done: 2, total: 5 },
    ])
  })

  it('ignores zero counts and never reports more done than expected', () => {
    const onChange = vi.fn()
    const tracker = createProgressTracker(onChange)

    tracker.expect(0)
    tracker.complete(0)
    expect(onChange).not.toHaveBeenCalled()

    tracker.expect(1)
    tracker.complete(2)
    expect(onChange).toHaveBeenLastCalledWith({ done: 1, total: 1 })
  })
})
