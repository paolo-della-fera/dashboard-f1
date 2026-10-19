import { useSyncExternalStore } from 'react'
import { CHART_CHROME, seriesColor, type ChartChrome } from '../lib/chartColors.ts'
import {
  parsePreference,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from '../lib/theme.ts'

interface ThemeState {
  preference: ThemePreference
  theme: Theme
}

function systemQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(SYSTEM_DARK_QUERY) : null
}

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    // Storage blocked (private mode, site data disabled): follow the system.
    return 'system'
  }
}

function computeState(preference: ThemePreference): ThemeState {
  return { preference, theme: resolveTheme(preference, systemQuery()?.matches ?? false) }
}

let state = computeState(readPreference())
const listeners = new Set<() => void>()

/** Sets `data-theme` on <html>; the inline script in index.html does the same before the first paint. */
function update(next: ThemeState) {
  state = next
  document.documentElement.dataset.theme = next.theme
  listeners.forEach((listener) => listener())
}

update(state)

function handleSystemChange() {
  if (state.preference === 'system') update(computeState('system'))
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) systemQuery()?.addEventListener('change', handleSystemChange)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) systemQuery()?.removeEventListener('change', handleSystemChange)
  }
}

function getSnapshot(): ThemeState {
  return state
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Not saved, but the choice still applies until the page is reloaded.
  }
  update(computeState(preference))
}

/** Saved preference (light, dark or system) and the theme actually shown. */
export function useTheme(): ThemeState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export interface ChartColors extends ChartChrome {
  theme: Theme
  /** The two drivers of the head-to-head: first two series slots. */
  pair: { a: string; b: string }
}

const CHART_COLORS: Record<Theme, ChartColors> = {
  light: { ...CHART_CHROME.light, theme: 'light', pair: { a: seriesColor(0, 'light'), b: seriesColor(1, 'light') } },
  dark: { ...CHART_CHROME.dark, theme: 'dark', pair: { a: seriesColor(0, 'dark'), b: seriesColor(1, 'dark') } },
}

/** Chart chrome and head-to-head colours for the current theme (stable objects per theme). */
export function useChartColors(): ChartColors {
  return CHART_COLORS[useTheme().theme]
}
