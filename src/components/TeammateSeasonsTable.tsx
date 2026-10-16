import type { TeammateSeason } from '../lib/headToHead.ts'
import { formatPoints } from '../lib/standings.ts'

interface TeammateSeasonsTableProps {
  seasons: TeammateSeason[]
  names: { a: string; b: string }
}

function points(value: number | null): string {
  return value === null ? '—' : formatPoints(value)
}

export default function TeammateSeasonsTable({ seasons, names }: TeammateSeasonsTableProps) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="caption-bottom pt-2 text-left text-xs text-gray-600">
          Posizione e punti nel campionato della stessa stagione: qui i punti sono confrontabili.
        </caption>
        <thead className="border-b border-gray-300 text-gray-600">
          <tr>
            <th scope="col" className="px-2 py-2">Stagione</th>
            <th scope="col" className="px-2 py-2">Team</th>
            <th scope="col" className="px-2 py-2 text-right">Gare insieme</th>
            <th scope="col" className="px-2 py-2 text-right">{names.a}</th>
            <th scope="col" className="px-2 py-2 text-right">{names.b}</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.season} className="border-b border-gray-200">
              <td className="px-2 py-2 tabular-nums">{season.season}</td>
              <td className="px-2 py-2">{season.teams.join(' / ')}</td>
              <td className="px-2 py-2 text-right tabular-nums">{season.races}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {season.a.position} · {points(season.a.points)} pt
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {season.b.position} · {points(season.b.points)} pt
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
