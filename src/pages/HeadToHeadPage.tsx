import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import AheadComparison from '../components/AheadComparison.tsx'
import CareerPositionChart from '../components/CareerPositionChart.tsx'
import DriverSearch from '../components/DriverSearch.tsx'
import DriverStatsCard from '../components/DriverStatsCard.tsx'
import FamousMatchups from '../components/FamousMatchups.tsx'
import LoadingProgress from '../components/LoadingProgress.tsx'
import SeasonBySeasonTable from '../components/SeasonBySeasonTable.tsx'
import StatBarsChart from '../components/StatBarsChart.tsx'
import TeammateSeasonsTable from '../components/TeammateSeasonsTable.tsx'
import { useCareerProgress } from '../hooks/careerProgress.ts'
import { useCalendar } from '../hooks/useCalendar.ts'
import { useChartColors } from '../hooks/useTheme.ts'
import { useAllDrivers, useDriverCareer } from '../hooks/useHeadToHead.ts'
import { useNow } from '../hooks/useNow.ts'
import { apiErrorMessage } from '../lib/apiErrorMessage.ts'
import { driverStats, headToHead, lastConcludedSeason, type RaceComparison, type QualifyingComparison } from '../lib/headToHead.ts'
import {
  careerPositionRows,
  countBars,
  driverLabel,
  FAMOUS_MATCHUPS,
  formatRate,
  type Matchup,
  rateBars,
  shortName,
  type Side,
  statLeaders,
} from '../lib/headToHeadView.ts'
import type { Driver } from '../types/jolpica.ts'

const PARAMS: Record<Side, string> = { a: 'pilota1', b: 'pilota2' }

function matchupSearch(matchup: Matchup): string {
  return `?${PARAMS.a}=${encodeURIComponent(matchup.a.driverId)}&${PARAMS.b}=${encodeURIComponent(matchup.b.driverId)}`
}

function raceNotes(comparison: RaceComparison): string[] {
  return comparison.bothUnclassified > 0
    ? [`${comparison.bothUnclassified} gare con nessuno dei due classificato, non contate.`]
    : []
}

function qualifyingNotes(comparison: QualifyingComparison): string[] {
  return comparison.fromGrid > 0
    ? [`${comparison.fromGrid} confronti decisi sulla griglia di partenza (mancano i dati di qualifica, presenti dal 1994).`]
    : []
}

export default function HeadToHeadPage() {
  const now = useNow(60_000)
  const colors = useChartColors().pair
  const currentYear = new Date(now).getFullYear()
  const [searchParams, setSearchParams] = useSearchParams()
  const ids: Record<Side, string | null> = {
    a: searchParams.get(PARAMS.a) || null,
    b: searchParams.get(PARAMS.b) || null,
  }
  const sameDriver = ids.a !== null && ids.a === ids.b

  const driversQuery = useAllDrivers()
  const allDrivers = driversQuery.data
  const findDriver = (id: string | null): Driver | null =>
    (id && allDrivers?.find((driver) => driver.driverId === id)) || null
  const drivers: Record<Side, Driver | null> = { a: findDriver(ids.a), b: findDriver(ids.b) }
  // An id in the URL that is not in the drivers list: nothing to load.
  const notFound: Record<Side, boolean> = {
    a: ids.a !== null && allDrivers !== undefined && drivers.a === null,
    b: ids.b !== null && allDrivers !== undefined && drivers.b === null,
  }

  const careerA = useDriverCareer(notFound.a ? null : ids.a)
  const careerB = useDriverCareer(notFound.b || sameDriver ? null : ids.b)
  const progressA = useCareerProgress(ids.a)
  const progressB = useCareerProgress(ids.b)

  const calendarQuery = useCalendar(currentYear)
  // Until the calendar arrives, the previous year is surely concluded.
  const lastConcluded = calendarQuery.data
    ? lastConcludedSeason(currentYear, calendarQuery.data, now)
    : currentYear - 1

  const statsA = useMemo(
    () => (careerA.data ? driverStats(careerA.data, lastConcluded) : null),
    [careerA.data, lastConcluded],
  )
  const statsB = useMemo(
    () => (careerB.data ? driverStats(careerB.data, lastConcluded) : null),
    [careerB.data, lastConcluded],
  )
  const comparison = useMemo(
    () => (careerA.data && careerB.data ? headToHead(careerA.data, careerB.data) : null),
    [careerA.data, careerB.data],
  )
  const leaders = statsA && statsB ? statLeaders(statsA, statsB) : null

  const fullNames: Record<Side, string> = {
    a: drivers.a ? driverLabel(drivers.a) : (ids.a ?? ''),
    b: drivers.b ? driverLabel(drivers.b) : (ids.b ?? ''),
  }
  const names = {
    a: drivers.a ? shortName(drivers.a, drivers.b) : fullNames.a,
    b: drivers.b ? shortName(drivers.b, drivers.a) : fullNames.b,
  }

  function selectDriver(side: Side, driverId: string | null) {
    const params = new URLSearchParams(searchParams)
    if (driverId) params.set(PARAMS[side], driverId)
    else params.delete(PARAMS[side])
    setSearchParams(params)
  }

  const slots = [
    { side: 'a' as const, query: careerA, stats: statsA, progress: progressA },
    { side: 'b' as const, query: careerB, stats: statsB, progress: progressB },
  ]

  return (
    <section>
      <h1 className="text-2xl font-bold">Testa a testa</h1>
      <p className="mt-1 text-sm text-muted">Confronta due piloti qualsiasi della storia della Formula 1, dal 1950.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(['a', 'b'] as const).map((side) => (
          <DriverSearch
            key={side}
            label={side === 'a' ? 'Primo pilota' : 'Secondo pilota'}
            drivers={allDrivers ?? []}
            selectedName={ids[side] ? fullNames[side] : null}
            disabled={!allDrivers}
            onSelect={(driverId) => selectDriver(side, driverId)}
          />
        ))}
      </div>

      {driversQuery.isPending && <p className="mt-2 text-sm text-muted">Caricamento dell'elenco dei piloti…</p>}
      {driversQuery.isError && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {apiErrorMessage(driversQuery.error)}
        </p>
      )}

      {!ids.a && !ids.b && (
        <>
          <p className="mt-6 text-muted">Scegli due piloti da confrontare, oppure parti da un confronto famoso.</p>
          <FamousMatchups matchups={FAMOUS_MATCHUPS} searchFor={matchupSearch} />
        </>
      )}

      {sameDriver && <p className="mt-6 text-muted">Scegli due piloti diversi.</p>}

      {(ids.a || ids.b) && !sameDriver && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {slots.map(({ side, query, stats, progress }) => {
            const id = ids[side]
            if (!id) {
              return (
                <p key={side} className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted">
                  Scegli il {side === 'a' ? 'primo' : 'secondo'} pilota.
                </p>
              )
            }
            if (notFound[side]) {
              return (
                <p key={side} role="alert" className="rounded-lg border border-line bg-surface p-4 text-sm text-accent">
                  Pilota non trovato.
                </p>
              )
            }
            if (query.isError) {
              return (
                <p key={side} role="alert" className="rounded-lg border border-line bg-surface p-4 text-sm text-accent">
                  {fullNames[side]}: {apiErrorMessage(query.error)}
                </p>
              )
            }
            if (!stats) return <LoadingProgress key={side} name={fullNames[side]} progress={progress} />
            return (
              <DriverStatsCard
                key={side}
                name={fullNames[side]}
                stats={stats}
                side={side}
                color={colors[side]}
                leaders={leaders}
              />
            )
          })}
        </div>
      )}

      {statsA && statsB && comparison && (
        <>
          <section className="mt-8" aria-labelledby="h2h-counts">
            <h2 id="h2h-counts" className="text-lg font-semibold">
              Vittorie, podi, pole e titoli
            </h2>
            <div className="mt-2">
              <StatBarsChart rows={countBars(statsA, statsB)} names={names} colors={colors} />
            </div>
          </section>

          <section className="mt-8" aria-labelledby="h2h-rates">
            <h2 id="h2h-rates" className="text-lg font-semibold">
              Percentuali per gara
            </h2>
            <p className="text-sm text-muted">Vittorie, podi e pole divisi per le gare disputate.</p>
            <div className="mt-2">
              <StatBarsChart
                rows={rateBars(statsA, statsB)}
                names={names}
                colors={colors}
                formatValue={(value) => formatRate(value / 100)}
              />
            </div>
          </section>

          <section className="mt-8" aria-labelledby="h2h-career">
            <h2 id="h2h-career" className="text-lg font-semibold">
              Posizione in campionato per anno di carriera
            </h2>
            <p className="text-sm text-muted">
              Anno 1 = prima stagione di ciascuno, così si confrontano carriere di epoche diverse. I punti mancanti sono
              stagioni senza posizione (pause, squalifica, non classificato).
            </p>
            <div className="mt-2">
              <CareerPositionChart
                rows={careerPositionRows(statsA.seasonBySeason, statsB.seasonBySeason)}
                names={names}
                colors={colors}
              />
            </div>
          </section>

          <section className="mt-8" aria-labelledby="h2h-together">
            <h2 id="h2h-together" className="text-lg font-semibold">
              In pista insieme
            </h2>
            {comparison.racesTogether === 0 ? (
              <p className="mt-1 text-sm text-muted">Non hanno mai corso nella stessa gara.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">
                  {comparison.racesTogether} gare disputate da entrambi: chi è arrivato davanti all'altro.
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <AheadComparison
                    title="In gara"
                    comparison={comparison.race}
                    names={names}
                    colors={colors}
                    notes={raceNotes(comparison.race)}
                  />
                  <AheadComparison
                    title="In qualifica"
                    index={1}
                    comparison={comparison.qualifying}
                    names={names}
                    colors={colors}
                    notes={qualifyingNotes(comparison.qualifying)}
                  />
                </div>
              </>
            )}
          </section>

          {comparison.teammates && (
            <section className="mt-8" aria-labelledby="h2h-teammates">
              <h2 id="h2h-teammates" className="text-lg font-semibold">
                Da compagni di squadra
              </h2>
              <p className="mt-1 text-sm text-muted">
                {comparison.teammates.races} gare con la stessa scuderia.
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <AheadComparison
                  title="In gara"
                  comparison={comparison.teammates.race}
                  names={names}
                  colors={colors}
                  notes={raceNotes(comparison.teammates.race)}
                />
                <AheadComparison
                  title="In qualifica"
                  index={1}
                  comparison={comparison.teammates.qualifying}
                  names={names}
                  colors={colors}
                  notes={qualifyingNotes(comparison.teammates.qualifying)}
                />
              </div>
              <TeammateSeasonsTable seasons={comparison.teammates.seasons} names={names} />
            </section>
          )}

          <section className="mt-8" aria-labelledby="h2h-seasons">
            <h2 id="h2h-seasons" className="text-lg font-semibold">
              Stagione per stagione
            </h2>
            <p role="note" className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <strong>Attenzione:</strong> i punti non sono confrontabili tra epoche diverse, perché il sistema di
              punteggio della F1 è cambiato molte volte. Per confrontare piloti di epoche diverse usa vittorie, podi, pole
              e percentuali.
            </p>
            <div className="mt-3 grid gap-3">
              <SeasonBySeasonTable name={fullNames.a} seasons={statsA.seasonBySeason} />
              <SeasonBySeasonTable name={fullNames.b} seasons={statsB.seasonBySeason} />
            </div>
          </section>
        </>
      )}
    </section>
  )
}
