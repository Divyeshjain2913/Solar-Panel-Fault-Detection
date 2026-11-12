import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import type { DailyTrend } from '../../types'

interface ActivityChartProps {
  data: DailyTrend[]
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#8B95A5]">
        No time-series telemetry available yet.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#272D36" vertical={false} />
          <XAxis
            dataKey="_id"
            stroke="#8B95A5"
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke="#8B95A5"
            fontSize={10}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1F27',
              borderColor: '#272D36',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#E8EDF4'
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Total Inspections"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="defective"
            name="Defective Panels"
            stroke="#EF4444"
            fill="#EF4444"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

