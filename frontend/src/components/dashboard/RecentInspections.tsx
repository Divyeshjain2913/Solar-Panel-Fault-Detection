import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Image as ImageIcon } from 'lucide-react'
import type { Inspection } from '../../types'
import { StatusBadge } from '../common/StatusBadge'

interface RecentInspectionsProps {
  inspections: Inspection[]
  isLoading?: boolean
}

export const RecentInspections: React.FC<RecentInspectionsProps> = ({
  inspections = [],
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-[#1A1F27] rounded-md animate-pulse" />
        ))}
      </div>
    )
  }

  if (inspections.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#8B95A5]">
        No recent inspections found. Run your first inspection to see results here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#272D36] text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider">
            <th className="py-3 px-4">Panel Thumbnail</th>
            <th className="py-3 px-4">Inspection ID</th>
            <th className="py-3 px-4">Condition</th>
            <th className="py-3 px-4">Detected Fault</th>
            <th className="py-3 px-4">Confidence</th>
            <th className="py-3 px-4">Timestamp</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#272D36]/60 text-xs">
          {inspections.map((item) => {
            const dateStr = item.inspection_timestamp
              ? new Date(item.inspection_timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '—'

            // Image URL mapping
            const imageSrc = item.original_image_path
              ? `/${item.original_image_path.replace(/\\/g, '/')}`
              : null

            return (
              <tr key={item.inspection_id} className="hover:bg-[#1A1F27]/40 transition-colors">
                <td className="py-2.5 px-4">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={item.image_filename}
                      className="w-10 h-10 object-cover rounded border border-[#272D36]"
                      onError={(e) => {
                        // Fallback on image load error
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#1A1F27] border border-[#272D36] rounded flex items-center justify-center text-[#8B95A5]">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4 font-mono font-medium text-[#E8EDF4]">
                  {item.inspection_id}
                </td>
                <td className="py-2.5 px-4">
                  <StatusBadge status={item.healthy_or_defective} size="sm" />
                </td>
                <td className="py-2.5 px-4 text-[#E8EDF4] font-medium">
                  {item.predicted_category}
                </td>
                <td className="py-2.5 px-4">
                  <span className="font-mono text-[#3B82F6] font-medium">
                    {item.confidence_score?.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 px-4 text-[#8B95A5]">
                  {dateStr}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <Link
                    to={`/history/${item.inspection_id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#3B82F6] hover:text-white bg-[#3B82F6]/10 hover:bg-[#3B82F6] rounded transition-colors"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

