import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: LucideIcon
  valueColor?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  valueColor = 'text-[#E8EDF4]'
}) => {
  return (
    <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-5 flex flex-col justify-between transition-colors hover:border-[#3B82F6]/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="p-1.5 bg-[#1A1F27] border border-[#272D36] rounded-md text-[#8B95A5]">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div>
        <div className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
        {subtext && <div className="text-[11px] text-[#8B95A5] mt-1">{subtext}</div>}
      </div>
    </div>
  )
}

