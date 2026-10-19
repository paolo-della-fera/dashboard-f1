import { Link } from 'react-router-dom'
import { resultsPath } from '../lib/results.ts'
import type { Race } from '../types/jolpica.ts'

interface RaceNavigationProps {
  previous: Race | null
  next: Race | null
  search: string
}

const linkClass =
  'inline-flex min-h-11 max-w-[48%] items-center gap-1 rounded border border-line-strong px-3 py-1.5 text-sm transition-colors duration-150 hover:border-accent hover:text-accent'

/** Links to the previous and next Grand Prix of the season, keeping the selected session. */
export default function RaceNavigation({ previous, next, search }: RaceNavigationProps) {
  if (!previous && !next) return null
  return (
    <nav aria-label="Gran Premi vicini" className="mt-6 flex flex-wrap justify-between gap-2">
      {previous ? (
        <Link to={resultsPath(previous) + search} className={linkClass} rel="prev">
          <span aria-hidden="true">← </span>
          <span className="sr-only">GP precedente: </span>
          {previous.raceName}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={resultsPath(next) + search} className={linkClass} rel="next">
          <span className="sr-only">GP successivo: </span>
          {next.raceName}
          <span aria-hidden="true"> →</span>
        </Link>
      )}
    </nav>
  )
}
