import type { TooltipContentProps } from 'recharts'
import { formatPoints, type ProgressionRow } from '../lib/standings.ts'

type PointsTooltipProps = Partial<TooltipContentProps<number, string>>

/** Race name, then each series with its points, highest first. */
export default function PointsTooltip({ active, payload }: PointsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload as ProgressionRow
  const entries = [...payload].sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
  return (
    <div className="rounded border border-gray-300 bg-white px-3 py-2 text-xs shadow">
      <p className="mb-1 font-semibold text-gray-900">
        {row.label} · {row.raceName}
      </p>
      <ul>
        {entries.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-2 text-gray-700">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="flex-1">{entry.name}</span>
            <span className="tabular-nums text-gray-900">{formatPoints(Number(entry.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
