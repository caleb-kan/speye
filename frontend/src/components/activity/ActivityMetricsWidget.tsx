import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ShieldCheck } from 'lucide-react'
import { VERIFIED_SCORE_THRESHOLD } from '../../constants/admin'

export interface DualMetricData {
  dateStr: string
  wpm: number | null
  score: number | null
}

interface ActivityMetricsWidgetProps {
  data: DualMetricData[]
  wpmAvg: number
  scoreAvg: number
  className?: string
}

interface MetricTooltipProps {
  active?: boolean
  payload?: readonly { dataKey: string; value: number | null }[]
  label?: string | number
}

const CustomTooltip = ({ active, payload, label }: MetricTooltipProps) => {
  if (active && payload && payload.length) {
    const wpmPayload = payload.find((p) => p.dataKey === 'wpm')
    const scorePayload = payload.find((p) => p.dataKey === 'score')

    return (
      <div className="bg-bg-secondary/95 backdrop-blur-md border border-text-secondary/10 px-3 py-2.5 rounded-xl shadow-xl z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-text-secondary text-[10px] font-bold uppercase tracking-wider mb-2 border-b border-text-secondary/20 pb-1.5">
          {label ?? ''}
        </p>
        <div className="space-y-2">
          {wpmPayload && wpmPayload.value !== null && (
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--color-primary)]" />
                <span className="text-[10px] font-medium text-text-secondary">
                  Speed
                </span>
              </div>
              <span className="text-sm font-bold text-text tabular-nums">
                {wpmPayload.value}{' '}
                <span className="text-[9px] text-primary">WPM</span>
              </span>
            </div>
          )}
          {scorePayload && scorePayload.value !== null && (
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_5px_#10b981]" />
                <span className="text-[10px] font-medium text-text-secondary">
                  Score
                </span>
              </div>
              <span className="text-sm font-bold text-text tabular-nums">
                {scorePayload.value}
                <span className="text-[9px] text-[#10b981]">%</span>
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

export function ActivityMetricsWidget({
  data,
  wpmAvg,
  scoreAvg,
  className = '',
}: ActivityMetricsWidgetProps) {
  if (data.length === 0) {
    return (
      <div
        className={`relative bg-bg-secondary/20 border border-text-secondary/10 rounded-2xl flex flex-col items-center justify-center p-4 sm:p-5 transition-colors duration-500 ${className}`}
      >
        <ShieldCheck className="w-10 h-10 text-text-secondary/30 mb-3" />
        <p className="text-text font-bold text-sm tracking-tight">
          No verified data found
        </p>
        <p className="text-text-secondary text-xs mt-1 max-w-[200px] text-center">
          Score {VERIFIED_SCORE_THRESHOLD}% or higher on a quiz to unlock
          verified speed trends.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`relative bg-bg-secondary/20 border border-text-secondary/10 rounded-2xl flex flex-col p-4 sm:p-5 transition-colors duration-500 hover:bg-bg-secondary/30 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between z-10 mb-4 gap-4 pointer-events-none">
        <div>
          <h3 className="text-sm font-bold text-text tracking-tight flex items-center gap-2">
            Performance
          </h3>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">
            Speed vs. Comprehension Trend
          </p>
        </div>

        {/* Dynamic Legend */}
        <div className="flex items-center gap-4 bg-bg-secondary/50 backdrop-blur-md border border-text-secondary/10 px-3 py-1.5 rounded-xl shadow-sm">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-text-secondary uppercase">
                Speed
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></div>
            </div>
            <span className="text-xs font-bold text-text tabular-nums leading-none mt-1">
              ~{wpmAvg}{' '}
              <span className="text-[9px] font-normal text-text-secondary">
                WPM
              </span>
            </span>
          </div>

          <div className="w-px h-6 bg-text-secondary/20 mx-1"></div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-text-secondary uppercase">
                Score
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></div>
            </div>
            <span className="text-xs font-bold text-text tabular-nums leading-none mt-1">
              {scoreAvg}{' '}
              <span className="text-[9px] font-normal text-text-secondary">
                %
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Dual-Axis Chart Area */}
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 25, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
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
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                fontSize: 9,
                fontWeight: 700,
              }}
              minTickGap={30}
              tickMargin={12}
              interval="preserveStartEnd"
            />

            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--color-primary)',
                fontSize: 9,
                fontWeight: 700,
                opacity: 0.6,
              }}
              tickCount={5}
              domain={['auto', 'auto']}
              width={35}
              dx={-5}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: '#10b981',
                fontSize: 9,
                fontWeight: 700,
                opacity: 0.6,
              }}
              tickCount={5}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              width={35}
              dx={5}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: 'var(--color-text-secondary)',
                strokeWidth: 1,
                strokeDasharray: '3 3',
                opacity: 0.5,
              }}
              allowEscapeViewBox={{ x: false, y: true }}
            />

            <Area
              yAxisId="left"
              type="natural"
              dataKey="wpm"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorWpm)"
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-primary)' }}
              animationDuration={1000}
              connectNulls={true}
            />
            <Area
              yAxisId="right"
              type="natural"
              dataKey="score"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorScore)"
              activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
              animationDuration={1200}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
