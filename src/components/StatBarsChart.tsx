import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { useChartColors } from '../hooks/useTheme.ts'
import type { BarRow } from '../lib/headToHeadView.ts'
import { CHART_ANIMATION_MS } from '../lib/motion.ts'
import ComparisonLegend from './ComparisonLegend.tsx'

interface StatBarsChartProps {
  rows: BarRow[]
  names: { a: string; b: string }
  colors: { a: string; b: string }
  formatValue?: (value: number) => string
}

/** Side-by-side bars, one pair per statistic. */
export default function StatBarsChart({ rows, names, colors, formatValue = String }: StatBarsChartProps) {
  const reduceMotion = useReducedMotion()
  const chrome = useChartColors()
  const format = (value: number | null) => (value === null ? 'n.d.' : formatValue(value))
  // Text alternative for screen readers: every value of the chart.
  const description = `Grafico a barre. ${rows
    .map((row) => `${row.label}: ${names.a} ${format(row.a)}, ${names.b} ${format(row.b)}`)
    .join('; ')}.`
  return (
    <figure aria-label={description}>
      <ComparisonLegend
        items={[
          { name: names.a, color: colors.a },
          { name: names.b, color: colors.b },
        ]}
      />
      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chrome.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: chrome.tick }} stroke={chrome.axis} />
            <YAxis
              tick={{ fontSize: 12, fill: chrome.tick }}
              stroke={chrome.axis}
              width={44}
              allowDecimals={false}
              tickFormatter={(value: number) => formatValue(value)}
            />
            <Tooltip
              cursor={{ fill: chrome.cursor }}
              contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line-strong)', color: 'var(--fg)' }}
              formatter={(value) => (value === null || value === undefined ? '—' : formatValue(Number(value)))}
            />
            <Bar
              dataKey="a"
              name={names.a}
              fill={colors.a}
              radius={[2, 2, 0, 0]}
              isAnimationActive={!reduceMotion}
              animationDuration={CHART_ANIMATION_MS}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="b"
              name={names.b}
              fill={colors.b}
              radius={[2, 2, 0, 0]}
              isAnimationActive={!reduceMotion}
              animationDuration={CHART_ANIMATION_MS}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
