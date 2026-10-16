import type { StandingsKind } from '../lib/standings.ts'

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
  return (
    <div role="tablist" aria-label="Tipo di classifica" className="mt-4 flex gap-1 border-b border-gray-300">
      {TABS.map(({ kind, label }) => {
        const selected = kind === value
        return (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            onClick={() => onChange(kind)}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 py-1 text-sm font-medium transition-colors duration-150 ${
              selected ? 'border-red-700 text-red-700' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
