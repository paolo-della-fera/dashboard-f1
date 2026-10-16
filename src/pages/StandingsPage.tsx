import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConstructorStandingsTable from '../components/ConstructorStandingsTable.tsx'
import DriverStandingsTable from '../components/DriverStandingsTable.tsx'
import PointsChart from '../components/PointsChart.tsx'
import SeasonSelect from '../components/SeasonSelect.tsx'
import StandingsTabs from '../components/StandingsTabs.tsx'
import TopNSelect from '../components/TopNSelect.tsx'
import { useStandings, useStandingsHistory } from '../hooks/useStandings.ts'
import { apiErrorMessage } from '../lib/apiErrorMessage.ts'
import { parseSeason, seasonOptions } from '../lib/calendar.ts'
import {
  buildPointsProgression,
  DEFAULT_TOP_N,
  FIRST_CONSTRUCTORS_SEASON,
  hasConstructorStandings,
  isDriverStanding,
  parseKind,
  type StandingsKind,
  TOP_N_OPTIONS,
  topSeries,
} from '../lib/standings.ts'
import type { ConstructorStanding } from '../types/jolpica.ts'

export default function StandingsPage() {
  const currentYear = new Date().getFullYear()
  const [searchParams, setSearchParams] = useSearchParams()
  const season = parseSeason(searchParams.get('stagione'), currentYear)
  const kind = parseKind(searchParams.get('tipo'))
  const [topN, setTopN] = useState(DEFAULT_TOP_N)
  const panelId = useId()
  const chartTitleId = useId()

  const available = kind === 'drivers' || hasConstructorStandings(season)
  const standingsQuery = useStandings(season, kind, available)
  const standings = standingsQuery.data ?? []
  // The chart costs one request per race: only load it once the table is there.
  const historyQuery = useStandingsHistory(season, kind, available && standings.length > 0)

  function navigate(nextSeason: number, nextKind: StandingsKind) {
    const params: Record<string, string> = {}
    if (nextSeason !== currentYear) params.stagione = String(nextSeason)
    if (nextKind === 'constructors') params.tipo = 'costruttori'
    setSearchParams(params)
  }

  const series = topSeries(standings, topN)
  const rows = historyQuery.data
    ? buildPointsProgression(
        historyQuery.data.history,
        historyQuery.data.races,
        series.map((entry) => entry.id),
      )
    : []

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Classifiche</h1>
        <SeasonSelect
          seasons={seasonOptions(currentYear)}
          value={season}
          onChange={(next) => navigate(next, kind)}
        />
      </div>

      <StandingsTabs value={kind} onChange={(next) => navigate(season, next)} panelId={panelId} />

      <div id={panelId} role="tabpanel" aria-label={kind === 'drivers' ? 'Piloti' : 'Costruttori'}>
        {!available && (
          <p className="mt-4 text-gray-600">
            La classifica costruttori esiste solo dal {FIRST_CONSTRUCTORS_SEASON}.
          </p>
        )}

        {available && standingsQuery.isPending && (
          <p className="mt-4 text-gray-600">Caricamento della classifica…</p>
        )}

        {standingsQuery.isError && (
          <p role="alert" className="mt-4 text-red-700">
            {apiErrorMessage(standingsQuery.error)}
          </p>
        )}

        {standingsQuery.isSuccess && standings.length === 0 && (
          <p className="mt-4 text-gray-600">Classifica della stagione {season} non ancora disponibile.</p>
        )}

        {standingsQuery.isSuccess && standings.length > 0 && (
          <>
            {kind === 'drivers' ? (
              <DriverStandingsTable standings={standings.filter(isDriverStanding)} />
            ) : (
              <ConstructorStandingsTable
                standings={standings.filter(
                  (standing): standing is ConstructorStanding => !isDriverStanding(standing),
                )}
              />
            )}

            <section aria-labelledby={chartTitleId} className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={chartTitleId} className="text-lg font-semibold">
                  Andamento dei punti
                </h2>
                <TopNSelect options={TOP_N_OPTIONS} value={topN} onChange={setTopN} />
              </div>

              {historyQuery.isPending && (
                <p className="mt-2 text-gray-600">Caricamento del grafico, una richiesta per gara…</p>
              )}

              {historyQuery.isError && (
                <p role="alert" className="mt-2 text-red-700">
                  {apiErrorMessage(historyQuery.error)}
                </p>
              )}

              {historyQuery.isSuccess && rows.length === 0 && (
                <p className="mt-2 text-gray-600">Nessuna gara ancora disputata.</p>
              )}

              {historyQuery.isSuccess && rows.length > 0 && (
                <div className="mt-2">
                  <PointsChart rows={rows} series={series} />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  )
}
