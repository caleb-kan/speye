import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface MetricDataPoint {
  dateStr: string
  value: number
}

export interface ChartMetric {
  id: string
  title: string
  total: string | number
  subtitle: string
  icon: ReactNode
  data: MetricDataPoint[]
  color: string
  valueLabel: string
  valueFormatter?: (val: number) => string | number
}

interface AdminMetricsWidgetProps {
  metrics: ChartMetric[]
  className?: string
}

const formatDateLabel = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase()
  } catch {
    return dateStr
  }
}

const formatTooltipDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

interface MetricTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  activeMetric: ChartMetric
}

const CustomTooltip = ({
  active,
  payload,
  label,
  activeMetric,
}: MetricTooltipProps) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    const displayValue = activeMetric.valueFormatter
      ? activeMetric.valueFormatter(val)
      : val

    return (
      <div className="bg-bg-secondary/95 backdrop-blur-md border border-text-secondary/10 px-3 py-2 rounded-lg shadow-xl z-50 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-text-secondary text-[10px] font-medium uppercase tracking-wider mb-0.5">
          {label ? formatTooltipDate(label) : ''}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-text tracking-tight">
            {displayValue}
          </span>
          <span
            className="text-[10px] font-medium"
            style={{ color: activeMetric.color }}
          >
            {activeMetric.valueLabel}
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function AdminMetricsWidget({
  metrics,
  className = '',
}: AdminMetricsWidgetProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeMetric = metrics[activeIndex]

  // Handlers for manual arrows
  const handleNext = () => setActiveIndex((prev) => (prev + 1) % metrics.length)
  const handlePrev = () =>
    setActiveIndex((prev) => (prev - 1 + metrics.length) % metrics.length)

  if (!metrics || metrics.length === 0) return null

  return (
    <div
      className={`group relative bg-bg-secondary/30 border border-text-secondary/10 rounded-2xl flex flex-col transition-colors duration-500 ${className}`}
      style={{ height: '160px' }}
    >
      {/* Title + Icon (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div
          className="p-1.5 rounded-md backdrop-blur-sm transition-colors duration-500"
          style={{
            backgroundColor: `${activeMetric.color}20`,
            color: activeMetric.color,
          }}
        >
          {activeMetric.icon}
        </div>
        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold drop-shadow-sm transition-all duration-300">
          {activeMetric.title}
        </span>
      </div>

      {/* Pagination Controls (Top Centre) */}
      {metrics.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-bg/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/5 shadow-sm opacity-30 group-hover:opacity-100 group-hover:bg-bg/70 transition-all duration-300">
          <button
            onClick={handlePrev}
            className="text-text-secondary hover:text-text transition-colors p-0.5"
            aria-label="Previous metric"
          >
            <ChevronLeft size={12} strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {metrics.map((metric, idx) => (
              <button
                key={metric.id}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx
                    ? 'w-3 opacity-100'
                    : 'w-1.5 opacity-40 hover:opacity-80'
                }`}
                style={{
                  backgroundColor:
                    activeIndex === idx
                      ? activeMetric.color
                      : 'var(--color-text-secondary)',
                }}
                aria-label={`View metric ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="text-text-secondary hover:text-text transition-colors p-0.5"
            aria-label="Next metric"
          >
            <ChevronRight size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Total + Context (Top Right) */}
      <div className="absolute top-0 right-0 z-10 pt-4 pr-8 pb-10 pl-12 text-right bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-bg via-bg/70 to-transparent pointer-events-none rounded-tr-2xl">
        <h3 className="text-3xl font-bold text-text tracking-tight leading-none drop-shadow-md">
          {activeMetric.total}
        </h3>
        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wide mt-1 opacity-90 drop-shadow-sm">
          {activeMetric.subtitle}
        </p>
      </div>

      {/* Chart */}
      <div className="absolute inset-0 w-full h-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={activeMetric.data}
            margin={{ top: 55, right: 25, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={activeMetric.color}
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor={activeMetric.color}
                  stopOpacity={0}
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
              dataKey="dateStr"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--color-text-secondary)',
                fontSize: 10,
                fontWeight: 700,
              }}
              tickFormatter={formatDateLabel}
              minTickGap={30}
              tickMargin={8}
              interval="preserveStartEnd"
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--color-text-secondary)',
                fontSize: 9,
                fontWeight: 600,
              }}
              tickCount={4}
              width={30}
              dx={-5}
            />

            <Tooltip
              content={<CustomTooltip activeMetric={activeMetric} />}
              cursor={{
                stroke: activeMetric.color,
                strokeWidth: 1,
                strokeDasharray: '3 3',
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={activeMetric.color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMetric)"
              activeDot={{ r: 4, strokeWidth: 0, fill: activeMetric.color }}
              animationDuration={800}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
