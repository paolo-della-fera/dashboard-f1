import { describe, expect, it } from 'vitest'
import { parsePreference, resolveTheme } from '../theme.ts'

describe('parsePreference', () => {
  it('keeps a saved light or dark choice', () => {
    expect(parsePreference('light')).toBe('light')
    expect(parsePreference('dark')).toBe('dark')
  })

  it('falls back to the system theme for missing or unknown values', () => {
    expect(parsePreference(null)).toBe('system')
    expect(parsePreference('system')).toBe('system')
    expect(parsePreference('blu')).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('follows the system only when the preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('lets an explicit choice win over the system', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
