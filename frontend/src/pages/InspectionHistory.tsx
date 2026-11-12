import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionService } from '../services/inspectionService'
import { StatusBadge } from '../components/common/StatusBadge'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Search, Filter, Trash2, ArrowRight, Image as ImageIcon } from 'lucide-react'

const CATEGORIES = [
  'All',
  'Bird-drop',
  'Clean',
  'Dusty',
  'Electrical-damage',
  'Physical-Damage',
  'Snow-Covered'
]

export const InspectionHistory: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(0)
  const pageSize = 15

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inspections', category, status, search, page],
    queryFn: () =>
      inspectionService.getInspections({
        category: category !== 'All' ? category : undefined,
        status: status !== 'All' ? status : undefined,
        search: search.trim() ? search.trim() : undefined,
        skip: page * pageSize,
        limit: pageSize
      })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inspectionService.deleteInspection(id),
    onSuccess: () => {
      setDeleteTargetId(null)
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['recentInspections'] })
    }
  })

  const totalPages = Math.ceil((data?.total || 0) / pageSize)

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8B95A5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search Inspection ID or Filename..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-[#1A1F27] border border-[#272D36] rounded-md text-xs text-[#E8EDF4] placeholder-[#8B95A5]/60 focus:outline-none focus:border-[#3B82F6] transition-colors"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#8B95A5]" />
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(0)
              }}
              className="bg-[#1A1F27] border border-[#272D36] text-xs text-[#E8EDF4] px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#3B82F6]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(0)
              }}
              className="bg-[#1A1F27] border border-[#272D36] text-xs text-[#E8EDF4] px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="All">All Statuses</option>
              <option value="Healthy">Healthy</option>
              <option value="Defective">Defective</option>
              <option value="Uncertain">Uncertain</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Failed to Load History"
          message={(error as Error).message}
          onRetry={refetch}
        />
      )}

      {/* Main Table Card */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton count={8} className="h-10 w-full" />
          </div>
        ) : (data?.items || []).length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Inspection Records Found"
              description="No audit logs matched your current search or category filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#272D36] text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider bg-[#101318]/50">
                  <th className="py-3 px-4">Panel Thumbnail</th>
                  <th className="py-3 px-4">Inspection ID</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Detected Fault</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#272D36]/60 text-xs">
                {data?.items.map((item) => {
                  const dateStr = item.inspection_timestamp
                    ? new Date(item.inspection_timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '—'

                  const imageSrc = item.original_image_path
                    ? `/${item.original_image_path.replace(/\\/g, '/')}`
                    : null

                  return (
                    <tr key={item.inspection_id} className="hover:bg-[#1A1F27]/40 transition-colors">
                      <td className="py-3 px-4">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={item.image_filename}
                            className="w-10 h-10 object-cover rounded border border-[#272D36]"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-[#1A1F27] border border-[#272D36] rounded flex items-center justify-center text-[#8B95A5]">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#E8EDF4]">
                        {item.inspection_id}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.healthy_or_defective} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-[#E8EDF4] font-medium">
                        {item.predicted_category}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#3B82F6] font-medium">
                        {item.confidence_score?.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-[#8B95A5]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/history/${item.inspection_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#3B82F6] hover:text-white bg-[#3B82F6]/10 hover:bg-[#3B82F6] rounded transition-colors"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => setDeleteTargetId(item.inspection_id)}
                          className="inline-flex items-center p-1 text-[#8B95A5] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[#272D36] text-xs text-[#8B95A5]">
            <span>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data?.total || 0)} of {data?.total || 0} inspections
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 bg-[#1A1F27] hover:bg-[#272D36] disabled:opacity-40 disabled:cursor-not-allowed rounded border border-[#272D36] text-[#E8EDF4]"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-[11px]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 bg-[#1A1F27] hover:bg-[#272D36] disabled:opacity-40 disabled:cursor-not-allowed rounded border border-[#272D36] text-[#E8EDF4]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Inspection Record"
        message={`Are you sure you want to permanently delete inspection '${deleteTargetId}'? This action will remove the record from MongoDB and cannot be undone.`}
        confirmText="Delete Record"
        isDestructive
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId)
          }
        }}
      />
    </div>
  )
}

