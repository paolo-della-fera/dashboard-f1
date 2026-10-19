import { useId, useState } from 'react'
import { driverDetails, driverLabel, searchDrivers } from '../lib/headToHeadView.ts'
import type { Driver } from '../types/jolpica.ts'

interface DriverSearchProps {
  label: string
  drivers: Driver[]
  /** Name shown when a driver is selected and the box is not being edited. */
  selectedName: string | null
  disabled?: boolean
  onSelect: (driverId: string | null) => void
}

/** Search box with a list of matching drivers (ARIA combobox pattern). */
export default function DriverSearch({ label, drivers, selectedName, disabled = false, onSelect }: DriverSearchProps) {
  const id = useId()
  const listId = `${id}-list`
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const matches = editing ? searchDrivers(drivers, query) : []
  const open = matches.length > 0
  const activeIndex = Math.min(active, matches.length - 1)

  function choose(driver: Driver) {
    onSelect(driver.driverId)
    setEditing(false)
    setQuery('')
  }

  // Arrow keys move the active option: keep it visible inside the scrolling list.
  function moveActive(index: number) {
    setActive(index)
    document.getElementById(`${id}-option-${index}`)?.scrollIntoView?.({ block: 'nearest' })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && open) {
      event.preventDefault()
      moveActive((activeIndex + 1) % matches.length)
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault()
      moveActive((activeIndex - 1 + matches.length) % matches.length)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      choose(matches[activeIndex])
    } else if (event.key === 'Escape') {
      setEditing(false)
      setQuery('')
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-fg-soft">
        {label}
      </label>
      <div className="mt-1 flex gap-1">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Cerca un pilota…"
          disabled={disabled}
          value={editing ? query : (selectedName ?? '')}
          onFocus={() => {
            setEditing(true)
            setQuery('')
          }}
          onBlur={() => setEditing(false)}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-w-0 rounded border border-control bg-surface px-3 py-2 text-sm disabled:bg-sunken"
        />
        {selectedName && !editing && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label={`Rimuovi ${selectedName}`}
            className="min-h-11 min-w-11 rounded border border-control bg-surface text-sm text-muted hover:text-fg"
          >
            ×
          </button>
        )}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open}
        className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded border border-line-strong bg-surface py-1 text-sm shadow"
      >
        {matches.map((driver, index) => {
          const details = driverDetails(driver)
          return (
            <li
              key={driver.driverId}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown, not click: it fires before the input loses focus and closes the list.
              onMouseDown={(event) => {
                event.preventDefault()
                choose(driver)
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer justify-between gap-2 px-3 py-1.5 ${
                index === activeIndex ? 'bg-accent-soft text-accent-strong' : ''
              }`}
            >
              <span>{driverLabel(driver)}</span>
              {details && <span className="text-xs text-subtle">{details}</span>}
            </li>
          )
        })}
      </ul>
      {editing && query.trim() !== '' && matches.length === 0 && (
        <p className="mt-1 text-xs text-muted">Nessun pilota trovato.</p>
      )}
    </div>
  )
}
