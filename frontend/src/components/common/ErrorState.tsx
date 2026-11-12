import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Error',
  message,
  onRetry
}) => {
  return (
    <div className="flex items-start gap-3 p-4 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg text-[#E8EDF4]">
      <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#EF4444] mb-0.5">{title}</h4>
        <p className="text-xs text-[#8B95A5]">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#1A1F27] hover:bg-[#272D36] border border-[#272D36] rounded text-[#E8EDF4] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  )
}

