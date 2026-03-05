import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Timer } from 'lucide-react'
import type { WpmStats } from '../../services/adminService'

interface AdminWpmDistributionWidgetProps {
  data: WpmStats | null
  className?: string
}

interface WpmTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: WpmTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-secondary/95 backdrop-blur-xl border border-text-secondary/15 px-3.5 py-2.5 rounded-xl shadow-2xl z-50 min-w-[130px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-text-secondary text-[10px] font-bold uppercase tracking-wider mb-2 border-b border-text-secondary/20 pb-1.5 flex items-center gap-1.5">
          <Timer size={12} className="text-primary" />
          {label} WPM
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-medium text-text-secondary">
            Users
          </span>
          <span className="text-lg font-black text-text tracking-tight tabular-nums">
            {payload[0].value}
          </span>
        </div>
      </div>
    )
  }
  return null
}

interface CustomTickProps {
  x?: number | string
  y?: number | string
  payload?: { value: string; offset?: number }
  isLast?: boolean
}

const CustomXAxisTick = ({
  x = 0,
  y = 0,
  payload,
  isLast = false,
}: CustomTickProps) => {
  const cx = Number(x)
  const cy = Number(y)
  if (!payload) return null

  const parts = payload.value.split('-')
  const leftLabel = parts[0] ?? ''
  const rightLabel = parts[1] ?? ''
  const trueLeftEdge = cx - (payload.offset || 0)
  const trueRightEdge = cx + (payload.offset || 0)

  return (
    <g>
      {/* Standard Left-Edge Pip */}
      <g transform={`translate(${trueLeftEdge},${cy})`}>
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={4}
          stroke="var(--color-text-secondary)"
          opacity={0.3}
          strokeWidth={1}
        />
        <text
          x={0}
          y={14}
          fill="var(--color-text-secondary)"
          fontSize={8}
          fontWeight={700}
          textAnchor="middle"
          opacity={0.8}
        >
          {leftLabel}
        </text>
      </g>

      {/* Closing Right-Edge Pip (for 2000) */}
      {isLast && (
        <g transform={`translate(${trueRightEdge},${cy})`}>
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={4}
            stroke="var(--color-text-secondary)"
            opacity={0.3}
            strokeWidth={1}
          />
          <text
            x={0}
            y={14}
            fill="var(--color-text-secondary)"
            fontSize={8}
            fontWeight={700}
            textAnchor="middle"
            opacity={0.8}
          >
            {rightLabel}
          </text>
        </g>
      )}
    </g>
  )
}

export function AdminWpmDistributionWidget({
  data,
  className = '',
}: AdminWpmDistributionWidgetProps) {
  const [timeframe, setTimeframe] = useState<'last_7d' | 'recent' | 'all_time'>(
    'recent'
  )

  if (!data) return null

  const activeData = data[timeframe]
  const lastRange = activeData.distribution.at(-1)?.range ?? ''

  return (
    <div
      className={`relative bg-bg-secondary/20 border border-text-secondary/10 rounded-2xl flex flex-col transition-all duration-500 hover:bg-bg-secondary/30 shadow-sm ${className}`}
      style={{ height: '160px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 z-10 pointer-events-none">
        {/* Title + Icon */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary backdrop-blur-sm shadow-[0_0_10px_var(--color-primary)_inset] opacity-90">
            <Timer size={16} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold block mb-0.5">
              Verified Speed (Avg)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-text leading-none tracking-tight tabular-nums drop-shadow-sm">
                {activeData.avg_wpm}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle Pill */}
        <div className="pointer-events-auto flex items-center bg-bg-secondary/40 backdrop-blur-xl p-1.5 rounded-xl border border-text-secondary/10 shadow-sm ring-1 ring-white/5">
          {(
            [
              ['last_7d', '7D'],
              ['recent', '30D'],
              ['all_time', 'ALL'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeframe(key)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                timeframe === key
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text hover:bg-text-secondary/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="absolute inset-0 w-full h-full pt-16 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeData.distribution}
            margin={{ top: 10, right: 20, left: 15, bottom: 0 }}
            barCategoryGap={1}
          >
            <defs>
              <linearGradient id="colorWpmBar" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="var(--color-text)"
              strokeOpacity={0.03}
              strokeDasharray="4 4"
            />

            <XAxis
              dataKey="range"
              axisLine={false}
              tickLine={false}
              tick={(props: CustomTickProps) => (
                <CustomXAxisTick
                  {...props}
                  isLast={props.payload?.value === lastRange}
                />
              )}
              interval={0}
              padding={{ left: 0, right: 0 }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--color-text-secondary)',
                fontSize: 10,
                fontWeight: 600,
                opacity: 0.5,
              }}
              tickCount={4}
              width={35}
              dx={-5}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--color-text-secondary)', opacity: 0.05 }}
            />

            <Bar
              dataKey="count"
              fill="url(#colorWpmBar)"
              radius={[1, 1, 0, 0]}
              maxBarSize={50}
              animationDuration={1000}
              activeBar={{
                fill: 'var(--color-primary)',
                fillOpacity: 0.8,
                stroke: 'var(--color-primary)',
                strokeWidth: 1,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
