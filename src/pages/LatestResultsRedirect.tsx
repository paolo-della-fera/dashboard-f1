import { Navigate, useSearchParams } from 'react-router-dom'
import { useCalendar } from '../hooks/useCalendar.ts'
import { useNow } from '../hooks/useNow.ts'
import { apiErrorMessage } from '../lib/apiErrorMessage.ts'
import { parseSeason } from '../lib/calendar.ts'
import { latestCompletedRace, resultsPath } from '../lib/results.ts'

/**
 * `/risultati` (optionally `?stagione=AAAA`): opens the last Grand Prix run in
 * the season; before the first race of the current season, the last one of
 * the previous season.
 */
export default function LatestResultsRedirect() {
  const now = useNow(60_000)
  const currentYear = new Date(now).getFullYear()
  const [searchParams] = useSearchParams()
  const season = parseSeason(searchParams.get('stagione'), currentYear)

  const calendar = useCalendar(season)
  const latest = calendar.data ? latestCompletedRace(calendar.data, now) : null
  const needsPrevious = calendar.isSuccess && latest === null && season === currentYear
  const previousCalendar = useCalendar(season - 1, needsPrevious)
  const previousLatest = previousCalendar.data ? latestCompletedRace(previousCalendar.data, now) : null

  const target = latest ?? (needsPrevious ? previousLatest : null)
  if (target) return <Navigate to={resultsPath(target)} replace />

  const error = calendar.error ?? (needsPrevious ? previousCalendar.error : null)
  const pending = calendar.isPending || (needsPrevious && previousCalendar.isPending)

  return (
    <section>
      <h1 className="text-2xl font-bold">Risultati</h1>
      {error ? (
        <p role="alert" className="mt-4 text-red-700">
          {apiErrorMessage(error)}
        </p>
      ) : pending ? (
        <p className="mt-4 text-gray-600">Caricamento dell'ultimo Gran Premio…</p>
      ) : (
        <p className="mt-4 text-gray-600">Nessun Gran Premio disputato nella stagione {season}.</p>
      )}
    </section>
  )
}
