import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionService } from '../services/inspectionService'
import { StatusBadge } from '../components/common/StatusBadge'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { ErrorState } from '../components/common/ErrorState'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import {
  ArrowLeft,
  Download,
  Trash2,
  Calendar,
  Cpu,
  ShieldAlert,
  Code
} from 'lucide-react'

export const InspectionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)

  const {
    data: inspection,
    isLoading,
    error
  } = useQuery({
    queryKey: ['inspectionDetail', id],
    queryFn: () => inspectionService.getInspectionById(id!),
    enabled: Boolean(id)
  })

  const deleteMutation = useMutation({
    mutationFn: (inspectionId: string) => inspectionService.deleteInspection(inspectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] })
      navigate('/history')
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton count={1} className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton count={1} className="h-96 w-full" />
          <LoadingSkeleton count={1} className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div className="space-y-4">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs text-[#3B82F6] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inspection History</span>
        </Link>
        <ErrorState
          title="Inspection Record Not Found"
          message={error ? (error as Error).message : 'Record could not be retrieved from MongoDB.'}
        />
      </div>
    )
  }

  const dateStr = inspection.inspection_timestamp
    ? new Date(inspection.inspection_timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      })
    : '—'

  const imageSrc = inspection.original_image_path
    ? `/${inspection.original_image_path.replace(/\\/g, '/')}`
    : null

  const sortedProbs = Object.entries(inspection.class_probabilities || {}).sort((a, b) => b[1] - a[1])

  const downloadReport = () => {
    const reportText = `====================================================
SOLARGUARD AI — CERTIFIED INSPECTION REPORT
====================================================
Inspection ID:         ${inspection.inspection_id}
Timestamp:             ${inspection.inspection_timestamp}
Source Filename:       ${inspection.image_filename}
Model Architecture:    MobileNetV2 Industrial Transfer Learning
Model Version:         ${inspection.model_version}

DIAGNOSTIC SUMMARY:
----------------------------------------------------
Condition Classification:  ${inspection.predicted_category}
Inspection Status:         ${inspection.healthy_or_defective}
Confidence Score:          ${inspection.confidence_score?.toFixed(2)}%
Risk Level:                ${inspection.risk_level}

RECOMMENDED INDUSTRIAL REMEDIATION:
----------------------------------------------------
${inspection.recommendation}

PROBABILITY DISTRIBUTION:
----------------------------------------------------
${sortedProbs.map(([c, p]) => `${c.padEnd(24)}: ${p.toFixed(2)}%`).join('\n')}

====================================================
Database Source: MongoDB solar_inspection
`
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Certified_Report_${inspection.inspection_id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8B95A5] hover:text-[#E8EDF4] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inspection History</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#15191F] hover:bg-[#1A1F27] border border-[#272D36] text-[#8B95A5] hover:text-[#E8EDF4] rounded-md transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showRawJson ? 'Hide Raw JSON' : 'View JSON'}</span>
          </button>
          <button
            onClick={downloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#15191F] hover:bg-[#1A1F27] border border-[#272D36] text-[#3B82F6] hover:text-[#E8EDF4] rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Certificate</span>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#EF4444]/10 hover:bg-[#EF4444] border border-[#EF4444]/30 text-[#EF4444] hover:text-white rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {showRawJson && (
        <pre className="p-4 bg-[#101318] border border-[#272D36] rounded-lg text-[11px] font-mono text-[#8B95A5] overflow-x-auto max-h-64">
          {JSON.stringify(inspection, null, 2)}
        </pre>
      )}

      {/* Main Two-Column Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Image Card */}
        <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#272D36]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E8EDF4]">
              High-Resolution Inspection Capture
            </h3>
            <span className="text-[11px] font-mono text-[#8B95A5]">{inspection.image_filename}</span>
          </div>
          <div className="bg-[#0B0D10] border border-[#272D36] rounded-md p-2 flex items-center justify-center">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={inspection.image_filename}
                className="max-h-[420px] w-auto object-contain rounded"
              />
            ) : (
              <div className="py-20 text-xs text-[#8B95A5]">No image file reference found.</div>
            )}
          </div>
          {inspection.inspection_notes && (
            <div className="p-3 bg-[#1A1F27] border border-[#272D36] rounded-md text-xs text-[#E8EDF4]">
              <span className="text-[10px] uppercase font-semibold text-[#8B95A5] block mb-0.5">
                Engineer Inspection Notes
              </span>
              {inspection.inspection_notes}
            </div>
          )}
        </div>

        {/* Right Column: Diagnostic & Telemetry Card */}
        <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#272D36]">
            <div>
              <span className="text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider">
                Inspection Identifier
              </span>
              <div className="text-lg font-bold font-mono text-[#E8EDF4]">
                {inspection.inspection_id}
              </div>
            </div>
            <StatusBadge status={inspection.healthy_or_defective} />
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#1A1F27] border border-[#272D36] rounded-md">
              <span className="text-[10px] text-[#8B95A5] uppercase font-semibold block mb-1">
                Detected Condition
              </span>
              <span className="text-sm font-bold text-[#E8EDF4]">{inspection.predicted_category}</span>
            </div>
            <div className="p-3 bg-[#1A1F27] border border-[#272D36] rounded-md">
              <span className="text-[10px] text-[#8B95A5] uppercase font-semibold block mb-1">
                Confidence Metric
              </span>
              <span className="text-sm font-bold font-mono text-[#3B82F6]">
                {inspection.confidence_score?.toFixed(1)}%
              </span>
            </div>
            <div className="p-3 bg-[#1A1F27] border border-[#272D36] rounded-md flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8B95A5]" />
              <div>
                <span className="text-[10px] text-[#8B95A5] uppercase font-semibold block">Timestamp</span>
                <span className="text-[11px] text-[#E8EDF4]">{dateStr}</span>
              </div>
            </div>
            <div className="p-3 bg-[#1A1F27] border border-[#272D36] rounded-md flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#8B95A5]" />
              <div>
                <span className="text-[10px] text-[#8B95A5] uppercase font-semibold block">Model Version</span>
                <span className="text-[11px] text-[#E8EDF4]">{inspection.model_version}</span>
              </div>
            </div>
          </div>

          {/* Remediation Action */}
          <div className="p-4 bg-[#3B82F6]/10 border border-[#3B82F6]/25 rounded-md text-xs text-[#E8EDF4] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#3B82F6] text-[11px] uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Recommended Remediation Protocol</span>
            </div>
            <p className="leading-relaxed">{inspection.recommendation}</p>
          </div>

          {/* Neural Probability Distribution */}
          <div>
            <div className="text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider mb-3">
              Neural Softmax Probability Distribution
            </div>
            <div className="space-y-2">
              {sortedProbs.map(([cname, pct]) => {
                const isSelected = cname === inspection.raw_class || cname === inspection.predicted_category
                return (
                  <div key={cname} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className={isSelected ? 'text-[#E8EDF4] font-semibold' : 'text-[#8B95A5]'}>
                        {cname}
                      </span>
                      <span className="font-mono text-[11px] text-[#8B95A5]">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1A1F27] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isSelected
                            ? inspection.healthy_or_defective === 'Healthy'
                              ? 'bg-[#22C55E]'
                              : inspection.healthy_or_defective === 'Uncertain'
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#EF4444]'
                            : 'bg-[#272D36]'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete Inspection Record"
        message={`Are you sure you want to permanently delete inspection '${inspection.inspection_id}' from MongoDB?`}
        confirmText="Confirm Delete"
        isDestructive
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate(inspection.inspection_id)}
      />
    </div>
  )
}

