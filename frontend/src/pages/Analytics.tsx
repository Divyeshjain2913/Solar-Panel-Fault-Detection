import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PieChart as PieIcon,
  Download,
  Calendar,
  Activity,
  Layers,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { analyticsService } from '../services/analyticsService'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { ErrorState } from '../components/common/ErrorState'

const FAULT_COLORS: Record<string, string> = {
  Clean: '#22C55E',
  'Bird-drop': '#F59E0B',
  'Physical-Damage': '#EF4444',
  'Electrical-damage': '#DC2626',
  'Dirty': '#D97706',
  'Snow-Covered': '#0284C7',
}

const CONDITION_COLORS = [
  { name: 'Healthy', color: '#22C55E' },
  { name: 'Defective', color: '#EF4444' },
  { name: 'Uncertain', color: '#F59E0B' },
]

export function Analytics() {
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: analyticsService.getAnalytics,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <ErrorState
        title="Failed to load analytics telemetry"
        message={error instanceof Error ? error.message : 'Unknown network error'}
        onRetry={refetch}
      />
    )
  }

  const categoryData = Object.entries(metrics.category_distribution || {}).map(([name, count]) => ({
    name,
    count,
    color: FAULT_COLORS[name] || '#64748B',
  }))

  const conditionData = [
    { name: 'Healthy', value: metrics.healthy_panels },
    { name: 'Defective', value: metrics.defective_panels },
    { name: 'Uncertain', value: metrics.uncertain_panels },
  ].filter((d) => d.value > 0)

  const trendData = (metrics.daily_trends || []).map((t) => ({
    date: t._id,
    Healthy: t.healthy,
    Defective: t.defective,
    Total: t.count,
  }))

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(metrics, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `solarguard_analytics_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#272D36]">
        <div>
          <h1 className="text-xl font-semibold text-[#E8EDF4] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#3B82F6]" />
            Industrial Telemetry & Analytics
          </h1>
          <p className="text-xs text-[#8B95A5] mt-1">
            Aggregated defect distributions, condition metrics, and historical inspection volume.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#15191F] hover:bg-[#1A1F27] border border-[#272D36] text-xs font-medium text-[#E8EDF4] rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
            Export Metrics (JSON)
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Total Inspected Panels</span>
            <Layers className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#E8EDF4] mt-2">{metrics.total_inspections}</div>
          <div className="text-[11px] text-[#8B95A5] mt-1">Aggregated in MongoDB database</div>
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Defect Detection Rate</span>
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-2xl font-bold text-[#EF4444] mt-2">
            {metrics.fault_detection_rate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#8B95A5] mt-1">
            {metrics.defective_panels} defective of {metrics.total_inspections} total
          </div>
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Fleet Health Ratio</span>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold text-[#22C55E] mt-2">
            {metrics.total_inspections > 0
              ? ((metrics.healthy_panels / metrics.total_inspections) * 100).toFixed(1)
              : '0.0'}
            %
          </div>
          <div className="text-[11px] text-[#8B95A5] mt-1">
            {metrics.healthy_panels} healthy panels confirmed
          </div>
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Mean Model Confidence</span>
            <Activity className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#3B82F6] mt-2">
            {(metrics.average_confidence * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#8B95A5] mt-1">
            {metrics.uncertain_panels} inspections flagged uncertain
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Longitudinal Inspection Activity */}
        <div className="lg:col-span-2 bg-[#15191F] border border-[#272D36] rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#E8EDF4] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
                Inspection Volume & Health Timeline
              </h2>
              <p className="text-xs text-[#8B95A5]">Chronological breakdown of inspections</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#272D36" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#8B95A5" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8B95A5" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#15191F',
                      borderColor: '#272D36',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Healthy"
                    stroke="#22C55E"
                    fill="#22C55E"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Defective"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#8B95A5]">
                No historical inspection timeline available
              </div>
            )}
          </div>
        </div>

        {/* Condition Ratio Doughnut */}
        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[#E8EDF4] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#3B82F6]" />
              Condition State Ratio
            </h2>
            <p className="text-xs text-[#8B95A5]">Proportion across health states</p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conditionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {conditionData.map((entry) => {
                    const cfg = CONDITION_COLORS.find((c) => c.name === entry.name)
                    return <Cell key={entry.name} fill={cfg?.color || '#3B82F6'} />
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15191F',
                    borderColor: '#272D36',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#8B95A5' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fault Categories Frequency */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF4] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#3B82F6]" />
              Defect Category Frequency
            </h2>
            <p className="text-xs text-[#8B95A5]">Distribution across the 6 standardized solar defect classes</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#272D36" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#8B95A5" fontSize={11} tickLine={false} />
              <YAxis stroke="#8B95A5" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#15191F',
                  borderColor: '#272D36',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
