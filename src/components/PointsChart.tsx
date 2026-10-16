import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { seriesColor } from '../lib/chartColors.ts'
import { CHART_ANIMATION_MS } from '../lib/motion.ts'
import type { ChartSeries, ProgressionRow } from '../lib/standings.ts'
import PointsTooltip from './PointsTooltip.tsx'

interface PointsChartProps {
  rows: ProgressionRow[]
  series: ChartSeries[]
}

export default function PointsChart({ rows, series }: PointsChartProps) {
  const reduceMotion = useReducedMotion()
  return (
    <div>
      <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
        {series.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4 rounded"
              style={{ background: seriesColor(index) }}
            />
            {entry.name}
          </li>
        ))}
      </ul>
      {/* Fits the screen width: on phones Recharts thins out the round labels, the tooltip names each race. */}
      <div className="mt-2 h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e5e3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#52514e' }}
              stroke="#c3c2b7"
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis tick={{ fontSize: 12, fill: '#52514e' }} stroke="#c3c2b7" width={40} />
            <Tooltip content={<PointsTooltip />} />
            {series.map((entry, index) => (
              <Line
                key={entry.id}
                type="monotone"
                name={entry.name}
                dataKey={(row: ProgressionRow) => row.points[entry.id]}
                stroke={seriesColor(index)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={!reduceMotion}
                animationDuration={CHART_ANIMATION_MS}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
