import { useSearchParams } from 'react-router-dom'
import NextRaceCard from '../components/NextRaceCard.tsx'
import RaceList from '../components/RaceList.tsx'
import SeasonSelect from '../components/SeasonSelect.tsx'
import { useCalendar } from '../hooks/useCalendar.ts'
import { useNow } from '../hooks/useNow.ts'
import { apiErrorMessage } from '../lib/apiErrorMessage.ts'
import { findNextRace, parseSeason, seasonOptions } from '../lib/calendar.ts'

export default function CalendarPage() {
  const now = useNow()
  const currentYear = new Date(now).getFullYear()
  const [searchParams, setSearchParams] = useSearchParams()
  const season = parseSeason(searchParams.get('stagione'), currentYear)
  const query = useCalendar(season)

  function changeSeason(next: number) {
    setSearchParams(next === currentYear ? {} : { stagione: String(next) })
  }

  const races = query.data ?? []
  const nextRace = findNextRace(races, now)

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <SeasonSelect seasons={seasonOptions(currentYear)} value={season} onChange={changeSeason} />
      </div>

      {query.isPending && <p className="mt-4 text-gray-600">Caricamento del calendario…</p>}

      {query.isError && (
        <p role="alert" className="mt-4 text-red-700">
          {apiErrorMessage(query.error)}
        </p>
      )}

      {query.isSuccess && races.length === 0 && (
        <p className="mt-4 text-gray-600">Calendario della stagione {season} non ancora disponibile.</p>
      )}

      {query.isSuccess && races.length > 0 && (
        <>
          {nextRace && <NextRaceCard race={nextRace} now={now} />}
          {!nextRace && season === currentYear && (
            <p className="mt-4 text-gray-600">La stagione {season} è conclusa.</p>
          )}
          <RaceList races={races} now={now} nextRace={nextRace} />
        </>
      )}
    </section>
  )
}
