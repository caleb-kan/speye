import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Users } from 'lucide-react'

// Custom interface for the tooltip to avoid 'any' and Recharts type complexity
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | string }>
  label?: string
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

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      // Added min-w-[120px] to ensure it has a nice shape
      <div className="bg-bg-secondary/95 backdrop-blur-md border border-text-secondary/10 px-3 py-2 rounded-lg shadow-xl z-50 min-w-[120px]">
        <p className="text-text-secondary text-[10px] font-medium uppercase tracking-wider mb-0.5">
          {label ? formatTooltipDate(label) : ''}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-text tracking-tight">
            {payload[0].value}
          </span>
          <span className="text-[10px] text-primary font-medium">active</span>
        </div>
      </div>
    )
  }
  return null
}

interface DataPoint {
  activity_date: string
  active_count: number
}

interface AdminGraphCardProps {
  title: string
  total: number | string
  data: DataPoint[]
  className?: string
}

export function AdminGraphCard({
  title,
  data,
  total,
  className = '',
}: AdminGraphCardProps) {
  return (
    <div
      className={`relative bg-bg-secondary/30 border border-text-secondary/10 rounded-2xl ${className}`}
      style={{ height: '160px' }}
    >
      {/* Title + Icon (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="p-1.5 bg-primary/10 rounded-md text-primary backdrop-blur-sm">
          <Users size={14} />
        </div>
        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold drop-shadow-sm">
          {title}
        </span>
      </div>

      {/* Total + Context (Top Right) */}
      <div className="absolute top-0 right-0 z-10 pt-4 pr-8 pb-10 pl-12 text-right bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-bg via-bg/70 to-transparent pointer-events-none rounded-tr-2xl">
        <h3 className="text-3xl font-bold text-text tracking-tight leading-none drop-shadow-md">
          {total}
        </h3>
        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wide mt-1 opacity-90 drop-shadow-sm">
          Last 30 Days
        </p>
      </div>

      {/* Graph */}
      <div className="absolute inset-0 w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 55, right: 20, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-primary)"
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
              dataKey="activity_date"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--color-text-secondary)',
                fontSize: 10,
                fontWeight: 700,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
              tickFormatter={formatDateLabel}
              minTickGap={30}
              tickMargin={8}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
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
              content={<CustomTooltip />}
              cursor={{
                stroke: 'var(--color-primary)',
                strokeWidth: 1,
                strokeDasharray: '3 3',
              }}
              allowEscapeViewBox={{ x: true, y: true }}
            />

            <Area
              type="monotone"
              dataKey="active_count"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUsers)"
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-primary)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
