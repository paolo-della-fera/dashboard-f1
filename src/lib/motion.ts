// Shared animation timings: everything stays short (under 400 ms) so that
// animations never delay reading the data.

/** Page enter transition, in seconds. */
export const PAGE_DURATION = 0.2
/** Fade-in of a single card or table row, in seconds. */
export const ITEM_DURATION = 0.2
/** Numbers counting up to their final value, in seconds. */
export const COUNT_UP_DURATION = 0.35
/** Recharts entry animation, in milliseconds (Recharts uses ms). */
export const CHART_ANIMATION_MS = 350

const STAGGER_STEP = 0.03
const MAX_STAGGER_DELAY = 0.18

/** Delay of the item at `index` in a sequence, capped so long tables finish quickly. */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(index, 0) * STAGGER_STEP, MAX_STAGGER_DELAY)
}

/** Props for a motion element that fades in, in sequence with its siblings. */
export function appear(index = 0) {
  return {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: ITEM_DURATION, delay: staggerDelay(index), ease: 'easeOut' as const },
  }
}

/**
 * Value shown while counting up to `target` (`progress` from 0 to 1): whole
 * numbers along the way, the exact target (decimals included) at the end.
 */
export function countUpFrame(target: number, progress: number): number {
  if (progress >= 1) return target
  return Math.round(target * Math.max(progress, 0))
}
