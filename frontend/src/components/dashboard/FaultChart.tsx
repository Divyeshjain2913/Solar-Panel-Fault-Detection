import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

interface FaultChartProps {
  data: Record<string, number>
}

export const FaultChart: React.FC<FaultChartProps> = ({ data }) => {
  const chartData = Object.entries(data || {}).map(([name, count]) => ({
    name,
    count
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#8B95A5]">
        No fault distribution records available.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#272D36" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#8B95A5"
            fontSize={10}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
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
            cursor={{ fill: '#1A1F27', opacity: 0.4 }}
          />
          <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

