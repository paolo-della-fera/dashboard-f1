import { useId } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import type { Matchup } from '../lib/headToHeadView.ts'
import { appear } from '../lib/motion.ts'

interface FamousMatchupsProps {
  matchups: Matchup[]
  /** Query string for a matchup, e.g. "?pilota1=senna&pilota2=prost". */
  searchFor: (matchup: Matchup) => string
}

export default function FamousMatchups({ matchups, searchFor }: FamousMatchupsProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="mt-6">
      <h2 id={titleId} className="text-sm font-medium text-gray-700">
        Confronti famosi
      </h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {matchups.map((matchup, index) => (
          <motion.li key={`${matchup.a.driverId}-${matchup.b.driverId}`} {...appear(index)}>
            <Link
              to={{ search: searchFor(matchup) }}
              className="block rounded-lg border border-gray-200 bg-white px-4 py-3 font-medium transition duration-150 hover:border-red-700 hover:text-red-700 hover:shadow-md motion-safe:hover:-translate-y-0.5"
            >
              {matchup.a.name} – {matchup.b.name}
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
