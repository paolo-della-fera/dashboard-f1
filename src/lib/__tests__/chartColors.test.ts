import { describe, expect, it } from 'vitest'
import { CHART_CHROME, SERIES_COLORS, SERIES_COLORS_DARK, seriesColor } from '../chartColors.ts'

describe('series colours', () => {
  it('has a dark step for every slot, with no duplicates in either theme', () => {
    expect(SERIES_COLORS_DARK).toHaveLength(SERIES_COLORS.length)
    expect(new Set(SERIES_COLORS).size).toBe(SERIES_COLORS.length)
    expect(new Set(SERIES_COLORS_DARK).size).toBe(SERIES_COLORS_DARK.length)
  })

  it('keeps the slot of a series across themes and defaults to light', () => {
    expect(seriesColor(1)).toBe(SERIES_COLORS[1])
    expect(seriesColor(1, 'dark')).toBe(SERIES_COLORS_DARK[1])
    expect(seriesColor(SERIES_COLORS.length, 'dark')).toBe(SERIES_COLORS_DARK[0])
  })

  it('defines the same chart chrome roles for both themes', () => {
    expect(Object.keys(CHART_CHROME.dark).sort()).toEqual(Object.keys(CHART_CHROME.light).sort())
  })
})
