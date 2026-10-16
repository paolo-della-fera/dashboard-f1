import { formatPoints, parsePoints, positionLabel } from '../lib/standings.ts'
import type { ConstructorStanding } from '../types/jolpica.ts'

interface ConstructorStandingsTableProps {
  standings: ConstructorStanding[]
}

export default function ConstructorStandingsTable({ standings }: ConstructorStandingsTableProps) {
  const hasExcluded = standings.some((standing) => standing.positionText === 'D')
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-300 text-gray-600">
          <tr>
            <th scope="col" className="px-2 py-2">Pos.</th>
            <th scope="col" className="px-2 py-2">Team</th>
            <th scope="col" className="px-2 py-2 text-right">Punti</th>
            <th scope="col" className="px-2 py-2 text-right">Vittorie</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => (
            <tr key={standing.Constructor.constructorId} className="border-b border-gray-200">
              <td className="px-2 py-2 tabular-nums">{positionLabel(standing)}</td>
              <td className="px-2 py-2 font-medium">{standing.Constructor.name}</td>
              <td className="px-2 py-2 text-right tabular-nums">{formatPoints(parsePoints(standing.points))}</td>
              <td className="px-2 py-2 text-right tabular-nums">{standing.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasExcluded && <p className="mt-2 text-xs text-gray-600">SQ = squalificato dal campionato.</p>}
    </div>
  )
}
