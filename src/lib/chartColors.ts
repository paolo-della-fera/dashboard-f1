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

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}
