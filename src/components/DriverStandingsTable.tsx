import { motion } from 'motion/react'
import { appear } from '../lib/motion.ts'
import { driverTeams, formatPoints, parsePoints, positionLabel } from '../lib/standings.ts'
import type { DriverStanding } from '../types/jolpica.ts'
import CountUp from './CountUp.tsx'

interface DriverStandingsTableProps {
  standings: DriverStanding[]
}

export default function DriverStandingsTable({ standings }: DriverStandingsTableProps) {
  const hasExcluded = standings.some((standing) => standing.positionText === 'D')
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line-strong text-muted">
          <tr>
            <th scope="col" className="px-2 py-2">Pos.</th>
            <th scope="col" className="px-2 py-2">Pilota</th>
            <th scope="col" className="px-2 py-2">Team</th>
            <th scope="col" className="px-2 py-2 text-right">Punti</th>
            <th scope="col" className="px-2 py-2 text-right">Vittorie</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => (
            <motion.tr key={standing.Driver.driverId} className="border-b border-line" {...appear(index)}>
              <td className="px-2 py-2 tabular-nums">{positionLabel(standing)}</td>
              <td className="px-2 py-2 font-medium">
                {standing.Driver.givenName} {standing.Driver.familyName}
              </td>
              <td className="px-2 py-2">{driverTeams(standing)}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                <CountUp value={parsePoints(standing.points)} format={formatPoints} />
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                <CountUp value={Number(standing.wins) || 0} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      {hasExcluded && <p className="mt-2 text-xs text-muted">SQ = squalificato dal campionato.</p>}
    </div>
  )
}
