import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Custom interface for the tooltip to avoid 'any' and Recharts type complexity
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | string }>
  label?: string
  formatValue?: (value: number | string) => string
  unit?: string
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

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
  unit,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const value = formatValue ? formatValue(payload[0].value) : payload[0].value

    return (
      <div className="bg-bg-secondary/95 backdrop-blur-md border border-text-secondary/10 px-3 py-2 rounded-lg shadow-xl z-50 min-w-[120px]">
        <p className="text-text-secondary text-[10px] font-medium uppercase tracking-wider mb-0.5">
          {label ? formatTooltipDate(label) : ''}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-text tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-[10px] text-primary font-medium">{unit}</span>
          )}
        </div>
      </div>
    )
  }
  return null
}

interface HistoryGraphProps<T extends Record<string, unknown>> {
  data: T[]
  dateKey: keyof T
  valueKey: keyof T
  gradientId?: string
  formatValue?: (value: unknown) => string
  unit?: string
  onHoverDataPoint?: (dataPoint: T | null) => void
}

export function HistoryGraph<T extends Record<string, unknown>>({
  data,
  dateKey,
  valueKey,
  gradientId = 'colorValue',
  formatValue,
  unit,
  onHoverDataPoint,
}: HistoryGraphProps<T>) {
  const handleMouseMove = (state: unknown) => {
    if (!state || typeof state !== 'object') return

    const chartState = state as {
      activePayload?: Array<{ payload?: unknown }>
      activeTooltipIndex?: unknown
    }

    const payloadPoint = chartState.activePayload?.[0]?.payload
    if (payloadPoint && typeof payloadPoint === 'object') {
      onHoverDataPoint?.(payloadPoint as T)
      return
    }

    const maybeIndex = chartState.activeTooltipIndex
    const index =
      typeof maybeIndex === 'number'
        ? maybeIndex
        : typeof maybeIndex === 'string'
          ? Number.parseInt(maybeIndex, 10)
          : Number.NaN

    if (!Number.isInteger(index) || index < 0 || index >= data.length) return

    onHoverDataPoint?.(data[index])
  }

  const handleMouseLeave = () => {
    onHoverDataPoint?.(null)
  }
  const values = data.map((item) => {
    const value = item[valueKey]
    return typeof value === 'number' ? value : 0
  })

  const minValue = values.length > 0 ? Math.min(...values) : 0
  const maxValue = values.length > 0 ? Math.max(...values) : 100

  const padding = (maxValue - minValue) * 0.1
  const yDomain = [
    Math.max(0, Math.floor(minValue - padding)),
    Math.ceil(maxValue + padding),
  ]

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
            dataKey={String(dateKey)}
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
            domain={yDomain}
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
            content={<CustomTooltip formatValue={formatValue} unit={unit} />}
            cursor={{
              stroke: 'var(--color-primary)',
              strokeWidth: 1,
              strokeDasharray: '3 3',
            }}
            allowEscapeViewBox={{ x: false, y: false }}
          />

          <Area
            type="monotone"
            dataKey={String(valueKey)}
            stroke="var(--color-primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-primary)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
