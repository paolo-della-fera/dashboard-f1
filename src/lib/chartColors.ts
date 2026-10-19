import type { Theme } from './theme.ts'

/**
 * Categorical colours for chart series, in fixed order (validated for colour
 * blindness as adjacent pairs). A series keeps its slot when others are added
 * or removed, so colour follows the entity, never its rank.
 */
export const SERIES_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#6250d6', // violet
  '#e34948', // red
] as const

/**
 * The same eight hues stepped for the dark background, slot by slot. Validated
 * as a set on the dark page and surface: every colour at least 3:1, worst
 * adjacent pair still distinguishable with colour blindness.
 */
export const SERIES_COLORS_DARK = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
] as const

export function seriesColor(index: number, theme: Theme = 'light'): string {
  const colors = theme === 'dark' ? SERIES_COLORS_DARK : SERIES_COLORS
  return colors[index % colors.length]
}

/** Grid, axis and labels of the charts; recessive, labels at least 4.5:1. */
export interface ChartChrome {
  grid: string
  axis: string
  tick: string
  cursor: string
}

export const CHART_CHROME: Record<Theme, ChartChrome> = {
  light: { grid: '#e5e5e3', axis: '#c3c2b7', tick: '#52514e', cursor: '#f1f1ee' },
  dark: { grid: '#2c2c2a', axis: '#5a5954', tick: '#c3c2b7', cursor: '#262624' },
}
