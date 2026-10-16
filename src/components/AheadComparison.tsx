import type { AheadCount } from '../lib/headToHead.ts'

interface AheadComparisonProps {
  title: string
  comparison: AheadCount
  names: { a: string; b: string }
  colors: { a: string; b: string }
  notes?: string[]
}

/** "Who finished ahead" count as a split bar. */
export default function AheadComparison({ title, comparison, names, colors, notes = [] }: AheadComparisonProps) {
  const total = comparison.aAhead + comparison.bAhead
  const aShare = total > 0 ? (comparison.aAhead / total) * 100 : 50
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <p className="mt-1 flex justify-between gap-2 text-sm">
        <span>
          {names.a} <strong className="tabular-nums">{comparison.aAhead}</strong>
        </span>
        <span>
          <strong className="tabular-nums">{comparison.bAhead}</strong> {names.b}
        </span>
      </p>
      <div aria-hidden="true" className="mt-1 flex h-3 overflow-hidden rounded bg-gray-200">
        {total > 0 && (
          <>
            <div style={{ width: `${aShare}%`, background: colors.a }} />
            <div style={{ width: `${100 - aShare}%`, background: colors.b }} />
          </>
        )}
      </div>
      {notes.map((note) => (
        <p key={note} className="mt-1 text-xs text-gray-600">
          {note}
        </p>
      ))}
    </div>
  )
}
