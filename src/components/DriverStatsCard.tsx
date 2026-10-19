import { motion } from 'motion/react'
import type { DriverStats } from '../lib/headToHead.ts'
import {
  fastestLapDisplay,
  formatRate,
  formatSeasons,
  type Side,
  type StatLeaders,
} from '../lib/headToHeadView.ts'
import { appear } from '../lib/motion.ts'
import CountUp from './CountUp.tsx'

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
  /** Numeric value that counts up; `value` is shown when absent (e.g. "n.d."). */
  count?: { value: number; format?: (value: number) => string }
  note?: string | null
  lead?: keyof StatLeaders
}

/** Rates count up in whole percentage points, ending on the exact rate. */
function rateCount(rate: number | null): StatRow['count'] {
  return rate === null ? undefined : { value: rate * 100, format: (value) => formatRate(value / 100) }
}

export default function DriverStatsCard({ name, stats, side, color, leaders }: DriverStatsCardProps) {
  const fastestLaps = fastestLapDisplay(stats)
  const best = stats.bestChampionshipPosition
  const rows: StatRow[] = [
    { label: 'Gare', value: String(stats.starts), count: { value: stats.starts } },
    { label: 'Vittorie', value: String(stats.wins), count: { value: stats.wins }, lead: 'wins' },
    { label: 'Podi', value: String(stats.podiums), count: { value: stats.podiums }, lead: 'podiums' },
    { label: 'Pole', value: String(stats.poles), count: { value: stats.poles }, lead: 'poles' },
    {
      label: 'Giri veloci',
      value: fastestLaps.value,
      count: stats.fastestLaps ? { value: stats.fastestLaps.count } : undefined,
      note: fastestLaps.note,
      lead: 'fastestLaps',
    },
    { label: 'Ritiri', value: String(stats.retirements), count: { value: stats.retirements } },
    {
      label: 'Titoli mondiali',
      value: String(stats.titles.length),
      count: { value: stats.titles.length },
      note: stats.titles.length > 0 ? formatSeasons(stats.titles) : null,
      lead: 'titles',
    },
    { label: 'Stagioni', value: String(stats.seasons), count: { value: stats.seasons } },
    { label: 'Vittorie %', value: formatRate(stats.winRate), count: rateCount(stats.winRate), lead: 'winRate' },
    { label: 'Podi %', value: formatRate(stats.podiumRate), count: rateCount(stats.podiumRate), lead: 'podiumRate' },
    { label: 'Pole %', value: formatRate(stats.poleRate), count: rateCount(stats.poleRate), lead: 'poleRate' },
    {
      label: 'Miglior piazzamento',
      value: best ? `${best.position}°` : '—',
      note: best ? formatSeasons(best.seasons) : null,
      lead: 'bestChampionshipPosition',
    },
  ]

  return (
    <motion.article
      className="rounded-lg border border-line bg-surface p-4 shadow-sm transition duration-150 hover:shadow-md dark:hover:border-line-strong"
      style={{ borderTop: `4px solid ${color}` }}
      {...appear(side === 'a' ? 0 : 1)}
    >
      <h2 className="text-lg font-semibold">{name}</h2>
      {stats.teams.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {stats.teams.map((team) => `${team.name} (${formatSeasons(team.seasons)})`).join(' · ')}
        </p>
      )}
      <dl className="mt-3 divide-y divide-line text-sm">
        {rows.map((row) => {
          const ahead = row.lead !== undefined && leaders?.[row.lead] === side
          return (
            <div
              key={row.label}
              className={`flex items-baseline justify-between gap-3 py-1.5 pl-2 ${ahead ? 'font-semibold' : ''}`}
              style={{ borderLeft: `3px solid ${ahead ? color : 'transparent'}` }}
            >
              <dt className="text-fg-soft">{row.label}</dt>
              <dd className="text-right">
                <span className="tabular-nums text-fg">
                  {row.count ? <CountUp value={row.count.value} format={row.count.format} /> : row.value}
                </span>
                {ahead && <span className="sr-only"> (in vantaggio)</span>}
                {row.note && <span className="block text-xs font-normal text-subtle">{row.note}</span>}
              </dd>
            </div>
          )
        })}
      </dl>
    </motion.article>
  )
}
