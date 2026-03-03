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
      <div className="bg-bg-secondary/95 backdrop-blur-md border border-text-secondary/10 px-3 py-2 rounded-lg shadow-xl z-50 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-text-secondary text-[10px] font-bold uppercase tracking-wider mb-1.5 border-b border-text-secondary/20 pb-1.5">
          {label} WPM
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-text tracking-tight">
            {payload[0].value}
          </span>
          <span className="text-[10px] font-medium text-text-secondary">
            users
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function AdminWpmDistributionWidget({
  data,
  className = '',
}: AdminWpmDistributionWidgetProps) {
  const [timeframe, setTimeframe] = useState<'recent' | 'all_time'>('recent')

  if (!data) return null

  const activeData = data[timeframe]
  const isRecent = timeframe === 'recent'

  return (
    <div
      className={`relative bg-bg-secondary/30 border border-text-secondary/10 rounded-2xl flex flex-col transition-colors duration-500 ${className}`}
      style={{ height: '160px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 z-10">
        {/* Title + Icon */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary backdrop-blur-sm">
            <Timer size={14} />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold block leading-tight">
              Verified Speed
            </span>
            <span className="text-sm font-bold text-text">
              ~{activeData.avg_wpm}{' '}
              <span className="text-[10px] font-normal text-text-secondary">
                WPM AVG
              </span>
            </span>
          </div>
        </div>

        {/* Toggle Pill */}
        <div className="flex items-center bg-bg/50 backdrop-blur-md p-1 rounded-lg border border-text-secondary/10 shadow-sm">
          <button
            onClick={() => setTimeframe('recent')}
            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all duration-300 ${
              isRecent
                ? 'bg-primary text-bg shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            30D
          </button>
          <button
            onClick={() => setTimeframe('all_time')}
            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all duration-300 ${
              !isRecent
                ? 'bg-primary text-bg shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            ALL
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="absolute inset-0 w-full h-full pt-16 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeData.distribution}
            margin={{ top: 10, right: 15, left: -5, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorWpmBar" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.2}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="var(--color-text)"
              strokeOpacity={0.03}
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="range"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--color-text-secondary)',
                fontSize: 9,
                fontWeight: 700,
              }}
              tickMargin={8}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--color-text-secondary)',
                fontSize: 9,
                fontWeight: 600,
              }}
              tickCount={3}
              width={35}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--color-text-secondary)', opacity: 0.05 }}
            />

            <Bar
              dataKey="count"
              fill="url(#colorWpmBar)"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              barSize={24}
              activeBar={{ fill: 'var(--color-primary)', fillOpacity: 0.8 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
