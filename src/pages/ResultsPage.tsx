import { useId } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QualifyingTable from '../components/QualifyingTable.tsx'
import RaceHeader from '../components/RaceHeader.tsx'
import RaceNavigation from '../components/RaceNavigation.tsx'
import RacePicker from '../components/RacePicker.tsx'
import RaceResultsTable from '../components/RaceResultsTable.tsx'
import SessionTabs from '../components/SessionTabs.tsx'
import { useCalendar } from '../hooks/useCalendar.ts'
import { useNow } from '../hooks/useNow.ts'
import { useQualifying, useRaceResults, useSprint } from '../hooks/useResults.ts'
import { apiErrorMessage } from '../lib/apiErrorMessage.ts'
import { raceStatus, seasonOptions } from '../lib/calendar.ts'
import {
  adjacentRaces,
  parseRaceParams,
  parseSession,
  SESSION_LABELS,
  sessionParam,
  type Session,
} from '../lib/results.ts'

export default function ResultsPage() {
  const now = useNow(60_000)
  const currentYear = new Date(now).getFullYear()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const panelId = useId()

  const parsed = parseRaceParams(params.season, params.round, currentYear)
  const season = parsed?.season ?? currentYear
  const round = parsed?.round ?? 0
  const calendar = useCalendar(season, parsed !== null)
  const races = calendar.data ?? []
  const race = races.find((entry) => Number(entry.round) === round) ?? null
  const started = race !== null && raceStatus(race, now) !== 'upcoming'
  const hasSprint = Boolean(race?.Sprint)
  const session = parseSession(searchParams.get('sessione'), hasSprint)

  // Each session is downloaded only when its tab is open.
  const raceQuery = useRaceResults(season, round, started && session === 'race')
  const qualifyingQuery = useQualifying(season, round, started && session === 'qualifying')
  const sprintQuery = useSprint(season, round, started && session === 'sprint')
  const sessionQuery = { race: raceQuery, qualifying: qualifyingQuery, sprint: sprintQuery }[session]

  const completed = races.filter((entry) => raceStatus(entry, now) === 'past')
  const { previous, next } = adjacentRaces(races, round, now)
  const search = searchParams.toString() ? `?${searchParams.toString()}` : ''

  function changeSession(nextSession: Session) {
    const param = sessionParam(nextSession)
    setSearchParams(param ? { sessione: param } : {})
  }

  function renderSession() {
    if (sessionQuery.isPending) {
      return <p className="mt-4 text-gray-600">Caricamento: {SESSION_LABELS[session].toLowerCase()}…</p>
    }
    if (sessionQuery.isError) {
      return (
        <p role="alert" className="mt-4 text-red-700">
          {apiErrorMessage(sessionQuery.error)}
        </p>
      )
    }
    const data = sessionQuery.data
    if (session === 'qualifying') {
      const results = data?.QualifyingResults ?? []
      if (results.length === 0) {
        return (
          <p className="mt-4 text-gray-600">
            Qualifiche non disponibili per questo Gran Premio. La posizione di partenza è nella colonna Griglia
            della gara.
          </p>
        )
      }
      return <QualifyingTable results={results} />
    }
    const results = (session === 'race' ? data?.Results : data?.SprintResults) ?? []
    if (results.length === 0) {
      return (
        <p className="mt-4 text-gray-600">
          {session === 'race' ? 'Risultati della gara' : 'Risultati della sprint'} non ancora disponibili.
        </p>
      )
    }
    return <RaceResultsTable results={results} />
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Risultati</h1>
        {parsed && (
          <RacePicker
            seasons={seasonOptions(currentYear)}
            season={season}
            races={completed}
            round={round}
            onSeasonChange={(nextSeason) => navigate(`/risultati?stagione=${nextSeason}`)}
            onRoundChange={(nextRound) => navigate(`/risultati/${season}/${nextRound}${search}`)}
          />
        )}
      </div>

      {(!parsed || (calendar.isSuccess && !race)) && (
        <p className="mt-4 text-gray-600">
          Gran Premio non trovato.{' '}
          <Link to="/risultati" className="text-red-700 underline hover:text-red-900">
            Vai all'ultimo Gran Premio disputato
          </Link>
        </p>
      )}

      {parsed && calendar.isPending && <p className="mt-4 text-gray-600">Caricamento del Gran Premio…</p>}

      {calendar.isError && (
        <p role="alert" className="mt-4 text-red-700">
          {apiErrorMessage(calendar.error)}
        </p>
      )}

      {race && (
        <>
          <RaceHeader race={race} />
          {started ? (
            <>
              <SessionTabs value={session} onChange={changeSession} hasSprint={hasSprint} panelId={panelId} />
              <div id={panelId} role="tabpanel" aria-label={SESSION_LABELS[session]}>
                {renderSession()}
              </div>
            </>
          ) : (
            <p className="mt-4 text-gray-600">Questo Gran Premio non si è ancora disputato.</p>
          )}
          <RaceNavigation previous={previous} next={next} search={search} />
        </>
      )}
    </section>
  )
}
