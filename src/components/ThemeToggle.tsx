import type { ReactNode } from 'react'
import { setThemePreference, useTheme } from '../hooks/useTheme.ts'
import type { ThemePreference } from '../lib/theme.ts'

const ICON_PROPS = {
  'aria-hidden': true,
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  {
    value: 'light',
    label: 'Tema chiaro',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Tema scuro',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'Tema di sistema',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
]

/** Light / dark / system switch for the red header; the choice is saved in the browser. */
export default function ThemeToggle() {
  const { preference } = useTheme()
  return (
    <div role="group" aria-label="Tema" className="flex rounded border border-white/40">
      {OPTIONS.map((option) => {
        const pressed = option.value === preference
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            aria-label={option.label}
            title={option.label}
            onClick={() => setThemePreference(option.value)}
            className={`flex min-h-11 min-w-11 items-center justify-center transition-colors duration-150 ${
              pressed ? 'bg-white text-red-700' : 'text-white hover:bg-red-600'
            }`}
          >
            {option.icon}
          </button>
        )
      })}
    </div>
  )
}
