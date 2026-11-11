import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import s from '../Gym.module.css'

export type ChartPoint = { label: string; value: number; tip: string; sub?: string }

const axis = { tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false, axisLine: false } as const

function Tip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const p = payload?.[0]?.payload as ChartPoint | undefined
  if (!active || !p) return null
  return (
    <div className={s.tooltip}>
      <strong>{p.tip}</strong>
      {p.sub ?? p.label}
    </div>
  )
}

/** Barras de una sola serie (color de acento, extremos redondeados). */
export function BarsChart({ data, label }: { data: ChartPoint[]; label: string }) {
  return (
    <div className={s.chart} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={0.5} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--fill)' }}
            content={(p) => <Tip active={p.active} payload={p.payload} />}
          />
          <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Línea de una sola serie con puntos (progresión). */
export function LineSeries({ data, label }: { data: ChartPoint[]; label: string }) {
  return (
    <div className={s.chart} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={0.5} />
          <XAxis dataKey="label" {...axis} minTickGap={16} />
          <YAxis {...axis} width={44} domain={['auto', 'auto']} />
          <Tooltip
            cursor={{ stroke: 'var(--line)', strokeWidth: 1 }}
            content={(p) => <Tip active={p.active} payload={p.payload} />}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
