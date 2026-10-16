import { motion } from 'motion/react'
import { appear } from '../lib/motion.ts'
import {
  fastestLapTime,
  gridLabel,
  hasAnyFastestLap,
  isFastestLap,
  leaderLaps,
  positionChange,
  positionLegend,
  resultPositionLabel,
  timeOrStatus,
} from '../lib/results.ts'
import { formatPoints, parsePoints } from '../lib/standings.ts'
import type { Result } from '../types/jolpica.ts'
import PositionChange from './PositionChange.tsx'

interface RaceResultsTableProps {
  results: Result[]
}

/** Classification of a race or a sprint. */
export default function RaceResultsTable({ results }: RaceResultsTableProps) {
  const lapsOfLeader = leaderLaps(results)
  const showFastestLap = hasAnyFastestLap(results)
  const hasPitLaneStart = results.some((result) => gridLabel(result) === 'Box')
  const legend = positionLegend(results)
  if (hasPitLaneStart) legend.push('Box = partito dalla corsia dei box')

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-300 text-gray-600">
          <tr>
            <th scope="col" className="px-2 py-2">Pos.</th>
            <th scope="col" className="px-2 py-2">Pilota</th>
            {/* Phones (360px): team goes under the driver, +/− and fastest lap are hidden. */}
            <th scope="col" className="hidden px-2 py-2 sm:table-cell">Team</th>
            <th scope="col" className="px-2 py-2 text-right">Griglia</th>
            <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">
              <abbr title="Posizioni guadagnate o perse" className="no-underline">+/−</abbr>
            </th>
            <th scope="col" className="px-2 py-2">Tempo / stato</th>
            <th scope="col" className="px-2 py-2 text-right">Punti</th>
            {showFastestLap && (
              <th scope="col" className="hidden px-2 py-2 sm:table-cell">
                Giro veloce
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const lapTime = fastestLapTime(result)
            const fastest = isFastestLap(result)
            return (
              // 1950s shared drives: the same driver can appear twice in a race.
              <motion.tr key={`${index}-${result.Driver.driverId}`} className="border-b border-gray-200" {...appear(index)}>
                <td className="px-2 py-2 tabular-nums">{resultPositionLabel(result)}</td>
                <td className="px-2 py-2 font-medium sm:whitespace-nowrap">
                  {result.Driver.givenName} {result.Driver.familyName}
                  <span className="block text-xs font-normal text-gray-500 sm:hidden">{result.Constructor.name}</span>
                </td>
                <td className="hidden px-2 py-2 whitespace-nowrap sm:table-cell">{result.Constructor.name}</td>
                <td className="px-2 py-2 text-right tabular-nums">{gridLabel(result)}</td>
                <td className="hidden px-2 py-2 text-right tabular-nums whitespace-nowrap sm:table-cell">
                  <PositionChange change={positionChange(result)} />
                </td>
                <td className="px-2 py-2 tabular-nums whitespace-nowrap">{timeOrStatus(result, lapsOfLeader)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatPoints(parsePoints(result.points))}</td>
                {showFastestLap && (
                  <td className="hidden px-2 py-2 tabular-nums whitespace-nowrap sm:table-cell">
                    {lapTime ? (
                      <span className={fastest ? 'rounded bg-purple-100 px-1.5 py-0.5 font-semibold text-purple-800' : ''}>
                        {lapTime}
                        {fastest && <span className="sr-only"> (giro più veloce)</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                )}
              </motion.tr>
            )
          })}
        </tbody>
      </table>
      {legend.length > 0 && <p className="mt-2 text-xs text-gray-600">{legend.join(' · ')}</p>}
      {showFastestLap && (
        <p className="mt-1 hidden text-xs text-gray-600 sm:block">
          <span className="rounded bg-purple-100 px-1.5 py-0.5 font-semibold text-purple-800">Viola</span> = giro più
          veloce della gara
        </p>
      )}
    </div>
  )
}
