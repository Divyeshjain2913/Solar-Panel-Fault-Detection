import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '../services/analyticsService'
import { inspectionService } from '../services/inspectionService'
import { MetricCard } from '../components/dashboard/MetricCard'
import { FaultChart } from '../components/dashboard/FaultChart'
import { ConditionChart } from '../components/dashboard/ConditionChart'
import { ActivityChart } from '../components/dashboard/ActivityChart'
import { RecentInspections } from '../components/dashboard/RecentInspections'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { ErrorState } from '../components/common/ErrorState'
import { Layers, ShieldCheck, AlertOctagon, TrendingUp, Cpu } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: () => analyticsService.getDashboardMetrics(),
    refetchInterval: 30000
  })

  const {
    data: recentData,
    isLoading: recentLoading
  } = useQuery({
    queryKey: ['recentInspections'],
    queryFn: () => inspectionService.getInspections({ limit: 8 }),
    refetchInterval: 30000
  })

  if (metricsError) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Telemetry Feed Failed"
          message={(metricsError as Error).message}
          onRetry={refetchMetrics}
        />
      </div>
    )
  }

  const total = metrics?.total_inspections ?? 0
  const healthy = metrics?.healthy_panels ?? 0
  const defective = metrics?.defective_panels ?? 0
  const faultRate = metrics?.fault_detection_rate ?? 0
  const accuracy = metrics?.model_accuracy ?? 78.15

  return (
    <div className="space-y-6">
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricsLoading ? (
          <LoadingSkeleton className="h-24 w-full" count={5} />
        ) : (
          <>
            <MetricCard
              label="Total Inspected"
              value={total}
              subtext="Verified PV Modules"
              icon={Layers}
            />
            <MetricCard
              label="Healthy Panels"
              value={healthy}
              subtext="Nominal Generation"
              valueColor="text-[#22C55E]"
              icon={ShieldCheck}
            />
            <MetricCard
              label="Defective Panels"
              value={defective}
              subtext="Remediation Required"
              valueColor="text-[#EF4444]"
              icon={AlertOctagon}
            />
            <MetricCard
              label="Anomaly Incident Rate"
              value={`${faultRate.toFixed(1)}%`}
              subtext="Defect Rate on Field"
              valueColor="text-[#F59E0B]"
              icon={TrendingUp}
            />
            <MetricCard
              label="Model Test Accuracy"
              value={`${accuracy.toFixed(1)}%`}
              subtext="MobileNetV2 Unseen Test"
              valueColor="text-[#3B82F6]"
              icon={Cpu}
            />
          </>
        )}
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#15191F] border border-[#272D36] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#272D36]">
            <div>
              <h3 className="text-sm font-semibold text-[#E8EDF4]">Fault Category Incidence</h3>
              <p className="text-[11px] text-[#8B95A5]">Distribution across all inspected anomaly classes</p>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#1A1F27] px-2 py-0.5 rounded border border-[#272D36] text-[#8B95A5]">
              Real-time
            </span>
          </div>
          {metricsLoading ? (
            <LoadingSkeleton className="h-64 w-full" />
          ) : (
            <FaultChart data={metrics?.category_distribution || {}} />
          )}
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#272D36]">
            <div>
              <h3 className="text-sm font-semibold text-[#E8EDF4]">Condition Split</h3>
              <p className="text-[11px] text-[#8B95A5]">Healthy vs Defective breakdown</p>
            </div>
          </div>
          {metricsLoading ? (
            <LoadingSkeleton className="h-64 w-full" />
          ) : (
            <ConditionChart
              healthy={healthy}
              defective={defective}
              uncertain={metrics?.uncertain_panels || 0}
            />
          )}
        </div>
      </div>

      {/* Activity Timeline Row */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#272D36]">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF4]">Daily Inspection Activity</h3>
            <p className="text-[11px] text-[#8B95A5]">Time-series module scan volume and anomaly capture</p>
          </div>
        </div>
        {metricsLoading ? (
          <LoadingSkeleton className="h-64 w-full" />
        ) : (
          <ActivityChart data={metrics?.daily_trends || []} />
        )}
      </div>

      {/* Recent Inspections Table */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#272D36]">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF4]">Recent Field Inspections</h3>
            <p className="text-[11px] text-[#8B95A5]">Latest verified telemetry records logged into MongoDB</p>
          </div>
        </div>
        <RecentInspections
          inspections={recentData?.items || []}
          isLoading={recentLoading}
        />
      </div>
    </div>
  )
}

