import { describe, expect, it } from 'vitest'
import { appear, countUpFrame, ITEM_DURATION, staggerDelay } from '../motion.ts'

describe('staggerDelay', () => {
  it('grows with the index', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(2)).toBeCloseTo(0.06)
  })

  it('is capped so that long tables finish within 400 ms', () => {
    expect(staggerDelay(6)).toBeCloseTo(0.18)
    expect(staggerDelay(40)).toBeCloseTo(0.18)
    expect(staggerDelay(40) + ITEM_DURATION).toBeLessThan(0.4)
  })

  it('treats negative indexes as the first item', () => {
    expect(staggerDelay(-3)).toBe(0)
  })
})

describe('appear', () => {
  it('fades in from slightly below, delayed by the index', () => {
    expect(appear()).toEqual({
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: ITEM_DURATION, delay: 0, ease: 'easeOut' },
    })
    expect(appear(3).transition.delay).toBeCloseTo(0.09)
    expect(appear(100).transition.delay).toBeCloseTo(0.18)
  })
})

describe('countUpFrame', () => {
  it('starts at 0 and ends exactly at the target', () => {
    expect(countUpFrame(41, 0)).toBe(0)
    expect(countUpFrame(41, 1)).toBe(41)
  })

  it('shows whole numbers along the way', () => {
    expect(countUpFrame(41, 0.5)).toBe(21)
    expect(countUpFrame(87.5, 0.5)).toBe(44)
  })

  it('keeps the decimals of the final value', () => {
    expect(countUpFrame(87.5, 1)).toBe(87.5)
    expect(countUpFrame(87.5, 1.2)).toBe(87.5)
  })

  it('clamps progress below 0', () => {
    expect(countUpFrame(10, -0.5)).toBe(0)
  })
})
