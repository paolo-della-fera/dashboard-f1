import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import type { Race } from '../types/jolpica.ts'
import { formatRaceDate, raceStatus } from '../lib/calendar.ts'
import { appear } from '../lib/motion.ts'

interface RaceListProps {
  races: Race[]
  now: number
  nextRace: Race | null
}

export default function RaceList({ races, now, nextRace }: RaceListProps) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-300 text-gray-600">
          <tr>
            <th scope="col" className="px-2 py-2">Round</th>
            <th scope="col" className="px-2 py-2">Gran Premio</th>
            {/* Phones (360px): circuit and country are hidden, they are on the results page. */}
            <th scope="col" className="hidden px-2 py-2 sm:table-cell">Circuito</th>
            <th scope="col" className="hidden px-2 py-2 sm:table-cell">Paese</th>
            <th scope="col" className="px-2 py-2">Data</th>
            <th scope="col" className="px-2 py-2">
              <span className="sr-only">Risultati</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {races.map((race, index) => {
            const past = raceStatus(race, now) === 'past'
            const isNext = race === nextRace
            return (
              <motion.tr
                key={race.round}
                {...appear(index)}
                aria-current={isNext ? 'true' : undefined}
                className={`border-b border-gray-200 ${past ? 'text-gray-500' : ''} ${
                  isNext ? 'bg-red-50 font-semibold' : ''
                }`}
              >
                <td className="px-2 py-2 tabular-nums">{race.round}</td>
                <td className="px-2 py-2">
                  {race.raceName}
                  {race.Sprint && (
                    <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">Sprint</span>
                  )}
                </td>
                <td className="hidden px-2 py-2 sm:table-cell">{race.Circuit.circuitName}</td>
                <td className="hidden px-2 py-2 sm:table-cell">{race.Circuit.Location.country}</td>
                <td className="px-2 py-2 whitespace-nowrap">{formatRaceDate(race)}</td>
                <td className="px-2 py-2">
                  {past && (
                    <Link
                      to={`/risultati/${race.season}/${race.round}`}
                      className="text-red-700 underline transition-colors duration-150 hover:text-red-900"
                      aria-label={`Risultati ${race.raceName} ${race.season}`}
                    >
                      Risultati
                    </Link>
                  )}
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
