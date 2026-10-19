export type ThemePreference = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

/** localStorage key; the inline script in index.html reads the same key. */
export const THEME_STORAGE_KEY = 'f1-theme'

export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

export function parsePreference(stored: string | null): ThemePreference {
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

/** Same rule as the inline script in index.html: keep the two in sync. */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}
