import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setThemePreference } from '../../hooks/useTheme.ts'
import { THEME_STORAGE_KEY } from '../../lib/theme.ts'
import ThemeToggle from '../ThemeToggle.tsx'

function stubSystemDark(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

describe('ThemeToggle', () => {
  afterEach(() => {
    setThemePreference('system')
    localStorage.clear()
  })

  it('applies and saves the chosen theme', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Tema scuro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Tema scuro' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tema chiaro' })).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Tema chiaro' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('follows the system theme when set to system', async () => {
    stubSystemDark(true)
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Tema di sistema' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Tema di sistema' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('is a labelled group of buttons reachable by keyboard', async () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Tema chiaro' })).toHaveFocus()
    await userEvent.keyboard('{Tab}{Enter}')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
