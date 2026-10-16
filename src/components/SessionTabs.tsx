import { SESSION_LABELS, type Session } from '../lib/results.ts'

interface SessionTabsProps {
  value: Session
  onChange: (session: Session) => void
  hasSprint: boolean
  panelId: string
}

export default function SessionTabs({ value, onChange, hasSprint, panelId }: SessionTabsProps) {
  const sessions: Session[] = hasSprint ? ['race', 'qualifying', 'sprint'] : ['race', 'qualifying']
  return (
    <div role="tablist" aria-label="Sessione" className="mt-6 flex gap-1 border-b border-gray-300">
      {sessions.map((session) => {
        const selected = session === value
        return (
          <button
            key={session}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            onClick={() => onChange(session)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              selected ? 'border-red-700 text-red-700' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {SESSION_LABELS[session]}
          </button>
        )
      })}
    </div>
  )
}
