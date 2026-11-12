import React from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Inbox className="w-10 h-10 text-[#8B95A5]" />,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#15191F] border border-[#272D36] rounded-lg">
      <div className="p-3 bg-[#1A1F27] border border-[#272D36] rounded-full mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[#E8EDF4] mb-1">{title}</h3>
      {description && <p className="text-xs text-[#8B95A5] max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}

