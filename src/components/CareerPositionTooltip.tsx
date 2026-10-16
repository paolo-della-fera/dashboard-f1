import type { TooltipContentProps } from 'recharts'
import type { CareerPositionRow, CareerSeasonPoint } from '../lib/headToHeadView.ts'

type CareerPositionTooltipProps = Partial<TooltipContentProps<number, string>> & {
  names: { a: string; b: string }
  colors: { a: string; b: string }
}

function describe(point: CareerSeasonPoint | null): string {
  if (!point) return 'nessuna stagione'
  const position = point.position === null ? point.label : `${point.position}°`
  return `${point.season}: ${position}${point.provisional ? ' (provvisoria)' : ''}`
}

/** Year of career, then each driver's real season and championship position. */
export default function CareerPositionTooltip({ active, payload, names, colors }: CareerPositionTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload as CareerPositionRow
  const entries = [
    { name: names.a, color: colors.a, point: row.seasonA },
    { name: names.b, color: colors.b, point: row.seasonB },
  ]
  return (
    <div className="rounded border border-gray-300 bg-white px-3 py-2 text-xs shadow">
      <p className="mb-1 font-semibold text-gray-900">Anno {row.year} di carriera</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-gray-700">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="flex-1">{entry.name}</span>
            <span className="tabular-nums text-gray-900">{describe(entry.point)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
