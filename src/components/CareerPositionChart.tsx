import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { useChartColors } from '../hooks/useTheme.ts'
import type { CareerPositionRow } from '../lib/headToHeadView.ts'
import { CHART_ANIMATION_MS } from '../lib/motion.ts'
import CareerPositionTooltip from './CareerPositionTooltip.tsx'
import ComparisonLegend from './ComparisonLegend.tsx'

interface CareerPositionChartProps {
  rows: CareerPositionRow[]
  names: { a: string; b: string }
  colors: { a: string; b: string }
}

/** Championship position by year of career; position 1 at the top. */
export default function CareerPositionChart({ rows, names, colors }: CareerPositionChartProps) {
  const reduceMotion = useReducedMotion()
  const chrome = useChartColors()
  return (
    <figure
      aria-label={`Grafico a linee: posizione in campionato per anno di carriera di ${names.a} e ${names.b}. Le posizioni anno per anno sono nelle tabelle "stagione per stagione".`}
    >
      <ComparisonLegend
        items={[
          { name: names.a, color: colors.a },
          { name: names.b, color: colors.b },
        ]}
      />
      {/* Fits the screen width: on phones Recharts thins out the year labels. */}
      <div className="mt-2 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
            <CartesianGrid stroke={chrome.grid} vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: chrome.tick }}
              stroke={chrome.axis}
              interval="preserveStartEnd"
              minTickGap={8}
              label={{ value: 'Anno di carriera', position: 'insideBottom', offset: -10, fontSize: 12, fill: chrome.tick }}
            />
            <YAxis
              reversed
              allowDecimals={false}
              domain={[1, 'dataMax']}
              tick={{ fontSize: 12, fill: chrome.tick }}
              stroke={chrome.axis}
              width={36}
            />
            <Tooltip content={<CareerPositionTooltip names={names} colors={colors} />} />
            {(['a', 'b'] as const).map((side) => (
              <Line
                key={side}
                type="linear"
                dataKey={side}
                name={names[side]}
                stroke={colors[side]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[side] }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={!reduceMotion}
                animationDuration={CHART_ANIMATION_MS}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
