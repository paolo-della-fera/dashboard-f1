import { motion, useReducedMotion } from 'motion/react'
import type { AheadCount } from '../lib/headToHead.ts'
import { appear, COUNT_UP_DURATION } from '../lib/motion.ts'
import CountUp from './CountUp.tsx'

interface AheadComparisonProps {
  title: string
  comparison: AheadCount
  names: { a: string; b: string }
  colors: { a: string; b: string }
  notes?: string[]
  /** Position in the sequence of comparisons shown together. */
  index?: number
}

/** "Who finished ahead" count as a split bar. */
export default function AheadComparison({ title, comparison, names, colors, notes = [], index = 0 }: AheadComparisonProps) {
  const reduceMotion = useReducedMotion()
  const total = comparison.aAhead + comparison.bAhead
  const aShare = total > 0 ? (comparison.aAhead / total) * 100 : 50
  return (
    <motion.div {...appear(index)}>
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <p className="mt-1 flex justify-between gap-2 text-sm">
        <span>
          {names.a}{' '}
          <strong className="tabular-nums">
            <CountUp value={comparison.aAhead} />
          </strong>
        </span>
        <span>
          <strong className="tabular-nums">
            <CountUp value={comparison.bAhead} />
          </strong>{' '}
          {names.b}
        </span>
      </p>
      <div aria-hidden="true" className="mt-1 flex h-3 overflow-hidden rounded bg-gray-200">
        {total > 0 && (
          <>
            {/* The split grows from the middle, in time with the counters. */}
            <motion.div
              style={{ background: colors.a }}
              initial={reduceMotion ? false : { width: '50%' }}
              animate={{ width: `${aShare}%` }}
              transition={{ duration: COUNT_UP_DURATION, ease: 'easeOut' }}
            />
            <div className="flex-1" style={{ background: colors.b }} />
          </>
        )}
      </div>
      {notes.map((note) => (
        <p key={note} className="mt-1 text-xs text-gray-600">
          {note}
        </p>
      ))}
    </motion.div>
  )
}
