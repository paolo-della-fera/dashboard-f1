import { useRef } from 'react'
import type { StandingsKind } from '../lib/standings.ts'
import { nextTabIndex } from '../lib/tabs.ts'

interface StandingsTabsProps {
  value: StandingsKind
  onChange: (kind: StandingsKind) => void
  panelId: string
}

const TABS: { kind: StandingsKind; label: string }[] = [
  { kind: 'drivers', label: 'Piloti' },
  { kind: 'constructors', label: 'Costruttori' },
]

export default function StandingsTabs({ value, onChange, panelId }: StandingsTabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const next = nextTabIndex(event.key, index, TABS.length)
    if (next === null) return
    event.preventDefault()
    onChange(TABS[next].kind)
    buttons.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Tipo di classifica" className="mt-4 flex gap-1 border-b border-line-strong">
      {TABS.map(({ kind, label }, index) => {
        const selected = kind === value
        return (
          <button
            key={kind}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            // Only the selected tab is in the Tab order; arrows move between tabs.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 py-1 text-sm font-medium transition-colors duration-150 ${
              selected ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
