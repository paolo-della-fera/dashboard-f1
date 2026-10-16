import { countdownParts } from '../lib/calendar.ts'

interface CountdownProps {
  target: number
  now: number
}

export default function Countdown({ target, now }: CountdownProps) {
  const { days, hours, minutes, seconds } = countdownParts(target, now)
  const units = [
    { label: 'giorni', value: days },
    { label: 'ore', value: hours },
    { label: 'minuti', value: minutes },
    { label: 'secondi', value: seconds },
  ]

  return (
    <div>
      <dl className="flex gap-3" aria-hidden="true">
        {units.map((unit) => (
          <div key={unit.label} className="min-w-14 rounded bg-white/15 px-2 py-1 text-center">
            <dd className="text-2xl font-bold tabular-nums">{String(unit.value).padStart(2, '0')}</dd>
            <dt className="text-xs uppercase">{unit.label}</dt>
          </div>
        ))}
      </dl>
      {/* Screen readers get a minute-level update instead of one every second. */}
      <p className="sr-only" aria-live="polite">
        Mancano {days} giorni, {hours} ore e {minutes} minuti
      </p>
    </div>
  )
}
