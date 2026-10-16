import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BarRow } from '../lib/headToHeadView.ts'
import ComparisonLegend from './ComparisonLegend.tsx'

interface StatBarsChartProps {
  rows: BarRow[]
  names: { a: string; b: string }
  colors: { a: string; b: string }
  formatValue?: (value: number) => string
}

/** Side-by-side bars, one pair per statistic. */
export default function StatBarsChart({ rows, names, colors, formatValue = String }: StatBarsChartProps) {
  return (
    <div>
      <ComparisonLegend
        items={[
          { name: names.a, color: colors.a },
          { name: names.b, color: colors.b },
        ]}
      />
      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e5e3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#52514e' }} stroke="#c3c2b7" />
            <YAxis
              tick={{ fontSize: 12, fill: '#52514e' }}
              stroke="#c3c2b7"
              width={44}
              allowDecimals={false}
              tickFormatter={(value: number) => formatValue(value)}
            />
            <Tooltip
              cursor={{ fill: '#f1f1ee' }}
              formatter={(value) => (value === null || value === undefined ? '—' : formatValue(Number(value)))}
            />
            <Bar dataKey="a" name={names.a} fill={colors.a} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="b" name={names.b} fill={colors.b} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
