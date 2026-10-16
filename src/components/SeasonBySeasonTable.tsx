import type { SeasonStats } from '../lib/headToHead.ts'
import { formatPoints } from '../lib/standings.ts'

interface SeasonBySeasonTableProps {
  name: string
  seasons: SeasonStats[]
}

export default function SeasonBySeasonTable({ name, seasons }: SeasonBySeasonTableProps) {
  return (
    <details className="rounded-lg border border-gray-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-medium">{name}: stagione per stagione</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-300 text-gray-600">
            <tr>
              <th scope="col" className="px-2 py-2">Stagione</th>
              <th scope="col" className="px-2 py-2">Team</th>
              <th scope="col" className="px-2 py-2 text-right">Gare</th>
              <th scope="col" className="px-2 py-2 text-right">Vitt.</th>
              <th scope="col" className="px-2 py-2 text-right">Podi</th>
              <th scope="col" className="px-2 py-2 text-right">Pole</th>
              <th scope="col" className="px-2 py-2 text-right">Pos.</th>
              <th scope="col" className="px-2 py-2 text-right">Punti*</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => (
              <tr key={season.season} className="border-b border-gray-200">
                <td className="px-2 py-2 tabular-nums">
                  {season.season}
                  {season.provisional && <span className="ml-1 text-xs text-gray-500">(provvisoria)</span>}
                </td>
                <td className="px-2 py-2">{season.teams.join(' / ') || '—'}</td>
                <td className="px-2 py-2 text-right tabular-nums">{season.starts}</td>
                <td className="px-2 py-2 text-right tabular-nums">{season.wins}</td>
                <td className="px-2 py-2 text-right tabular-nums">{season.podiums}</td>
                <td className="px-2 py-2 text-right tabular-nums">{season.poles}</td>
                <td className="px-2 py-2 text-right tabular-nums">{season.position}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {season.points === null ? '—' : formatPoints(season.points)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-600">
        * Punti ufficiali della stagione, non confrontabili tra epoche diverse. SQ = squalificato dal campionato, NC = non
        classificato.
      </p>
    </details>
  )
}
