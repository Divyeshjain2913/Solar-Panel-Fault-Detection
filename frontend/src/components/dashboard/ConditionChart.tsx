import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts'

interface ConditionChartProps {
  healthy: number
  defective: number
  uncertain?: number
}

const COLORS = {
  Healthy: '#22C55E',
  Defective: '#EF4444',
  Uncertain: '#F59E0B'
}

export const ConditionChart: React.FC<ConditionChartProps> = ({
  healthy,
  defective,
  uncertain = 0
}) => {
  const chartData = [
    { name: 'Healthy', value: healthy },
    { name: 'Defective', value: defective },
    { name: 'Uncertain', value: uncertain }
  ].filter(item => item.value > 0)

  const total = healthy + defective + uncertain

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#8B95A5]">
        No condition records available.
      </div>
    )
  }

  return (
    <div className="h-64 w-full flex items-center justify-between">
      <div className="w-1/2 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={COLORS[entry.name as keyof typeof COLORS] || '#3B82F6'}
                  stroke="#15191F"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A1F27',
                borderColor: '#272D36',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#E8EDF4'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="w-1/2 space-y-2.5 pr-4">
        {chartData.map((item) => {
          const color = COLORS[item.name as keyof typeof COLORS]
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
          return (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[#8B95A5]">{item.name}</span>
              </div>
              <div className="font-medium text-[#E8EDF4]">
                {item.value} <span className="text-[10px] text-[#8B95A5]">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

