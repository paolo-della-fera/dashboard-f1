import type { Race } from '../types/jolpica.ts'
import { formatRaceDate, raceStart, raceStatus } from '../lib/calendar.ts'
import Countdown from './Countdown.tsx'

interface NextRaceCardProps {
  race: Race
  now: number
}

export default function NextRaceCard({ race, now }: NextRaceCardProps) {
  const { Circuit } = race
  const live = raceStatus(race, now) === 'live'

  return (
    <section aria-labelledby="next-race-title" className="mt-6 rounded-lg bg-red-700 p-5 text-white shadow">
      <p className="text-sm font-medium uppercase tracking-wide text-red-100">
        {live ? 'Gara in corso' : 'Prossima gara'} · Round {race.round}
      </p>
      <h2 id="next-race-title" className="mt-1 text-2xl font-bold">
        {race.raceName}
        {race.Sprint && (
          <span className="ml-2 rounded bg-white px-2 py-0.5 align-middle text-xs font-semibold text-red-700">
            Sprint
          </span>
        )}
      </h2>
      <p className="mt-1 text-red-50">
        {Circuit.circuitName} – {Circuit.Location.locality}, {Circuit.Location.country}
      </p>
      <p className="mt-1 text-red-50">{formatRaceDate(race)}</p>
      <div className="mt-4">
        {live ? (
          <p className="text-xl font-semibold">In corso</p>
        ) : (
          <Countdown target={raceStart(race).getTime()} now={now} />
        )}
      </div>
    </section>
  )
}
