import React from 'react'
import type { ConditionStatus } from '../../types'

interface StatusBadgeProps {
  status: ConditionStatus | string
  size?: 'sm' | 'md'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isHealthy = status === 'Healthy' || status === 'Clean'
  const isDefective = status === 'Defective' || (!isHealthy && status !== 'Uncertain' && !status?.startsWith('Uncertain'))
  const isUncertain = status === 'Uncertain' || status?.startsWith('Uncertain')

  let bgClass = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25'
  let dotClass = 'bg-[#EF4444]'
  let label = status

  if (isHealthy) {
    bgClass = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25'
    dotClass = 'bg-[#22C55E]'
    label = 'Healthy'
  } else if (isUncertain) {
    bgClass = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25'
    dotClass = 'bg-[#F59E0B]'
    label = 'Uncertain'
  } else if (isDefective) {
    bgClass = 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25'
    dotClass = 'bg-[#EF4444]'
    label = 'Defective'
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium tracking-wide rounded-md border ${bgClass} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </span>
  )
}

