import type { DriverStats } from '../lib/headToHead.ts'
import {
  fastestLapDisplay,
  formatRate,
  formatSeasons,
  type Side,
  type StatLeaders,
} from '../lib/headToHeadView.ts'

interface DriverStatsCardProps {
  name: string
  stats: DriverStats
  side: Side
  color: string
  /** Null when the other driver is not loaded: nothing is highlighted. */
  leaders: StatLeaders | null
}

interface StatRow {
  label: string
  value: string
  note?: string | null
  lead?: keyof StatLeaders
}

export default function DriverStatsCard({ name, stats, side, color, leaders }: DriverStatsCardProps) {
  const fastestLaps = fastestLapDisplay(stats)
  const best = stats.bestChampionshipPosition
  const rows: StatRow[] = [
    { label: 'Gare', value: String(stats.starts) },
    { label: 'Vittorie', value: String(stats.wins), lead: 'wins' },
    { label: 'Podi', value: String(stats.podiums), lead: 'podiums' },
    { label: 'Pole', value: String(stats.poles), lead: 'poles' },
    { label: 'Giri veloci', value: fastestLaps.value, note: fastestLaps.note, lead: 'fastestLaps' },
    { label: 'Ritiri', value: String(stats.retirements) },
    {
      label: 'Titoli mondiali',
      value: String(stats.titles.length),
      note: stats.titles.length > 0 ? formatSeasons(stats.titles) : null,
      lead: 'titles',
    },
    { label: 'Stagioni', value: String(stats.seasons) },
    { label: 'Vittorie %', value: formatRate(stats.winRate), lead: 'winRate' },
    { label: 'Podi %', value: formatRate(stats.podiumRate), lead: 'podiumRate' },
    { label: 'Pole %', value: formatRate(stats.poleRate), lead: 'poleRate' },
    {
      label: 'Miglior piazzamento',
      value: best ? `${best.position}°` : '—',
      note: best ? formatSeasons(best.seasons) : null,
      lead: 'bestChampionshipPosition',
    },
  ]

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" style={{ borderTop: `4px solid ${color}` }}>
      <h2 className="text-lg font-semibold">{name}</h2>
      {stats.teams.length > 0 && (
        <p className="mt-1 text-sm text-gray-600">
          {stats.teams.map((team) => `${team.name} (${formatSeasons(team.seasons)})`).join(' · ')}
        </p>
      )}
      <dl className="mt-3 divide-y divide-gray-100 text-sm">
        {rows.map((row) => {
          const ahead = row.lead !== undefined && leaders?.[row.lead] === side
          return (
            <div
              key={row.label}
              className={`flex items-baseline justify-between gap-3 py-1.5 pl-2 ${ahead ? 'font-semibold' : ''}`}
              style={{ borderLeft: `3px solid ${ahead ? color : 'transparent'}` }}
            >
              <dt className="text-gray-700">{row.label}</dt>
              <dd className="text-right">
                <span className="tabular-nums text-gray-900">{row.value}</span>
                {ahead && <span className="sr-only"> (in vantaggio)</span>}
                {row.note && <span className="block text-xs font-normal text-gray-500">{row.note}</span>}
              </dd>
            </div>
          )
        })}
      </dl>
    </article>
  )
}
