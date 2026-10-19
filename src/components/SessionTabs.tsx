import { useRef } from 'react'
import { SESSION_LABELS, type Session } from '../lib/results.ts'
import { nextTabIndex } from '../lib/tabs.ts'

interface SessionTabsProps {
  value: Session
  onChange: (session: Session) => void
  hasSprint: boolean
  panelId: string
}

export default function SessionTabs({ value, onChange, hasSprint, panelId }: SessionTabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const sessions: Session[] = hasSprint ? ['race', 'qualifying', 'sprint'] : ['race', 'qualifying']

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const next = nextTabIndex(event.key, index, sessions.length)
    if (next === null) return
    event.preventDefault()
    onChange(sessions[next])
    buttons.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Sessione" className="mt-6 flex gap-1 border-b border-line-strong">
      {sessions.map((session, index) => {
        const selected = session === value
        return (
          <button
            key={session}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            // Only the selected tab is in the Tab order; arrows move between tabs.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(session)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 py-1 text-sm font-medium transition-colors duration-150 ${
              selected ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {SESSION_LABELS[session]}
          </button>
        )
      })}
    </div>
  )
}
