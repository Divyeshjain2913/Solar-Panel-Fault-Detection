import React from 'react'

interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = 'h-6 w-full', count = 1 }) => {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-[#1A1F27] border border-[#272D36]/60 rounded-md ${className}`}
        />
      ))}
    </div>
  )
}

