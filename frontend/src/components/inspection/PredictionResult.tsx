import React from 'react'
import { Download, RefreshCw, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react'
import type { Inspection } from '../../types'
import { StatusBadge } from '../common/StatusBadge'

interface PredictionResultProps {
  result: Inspection
  onReset: () => void
}

export const PredictionResult: React.FC<PredictionResultProps> = ({ result, onReset }) => {
  const isHealthy = result.healthy_or_defective === 'Healthy'
  const isUncertain = result.healthy_or_defective === 'Uncertain'

  const downloadReport = () => {
    const reportText = `====================================================
SOLARGUARD AI — CERTIFIED INSPECTION REPORT
====================================================
Inspection ID:         ${result.inspection_id}
Timestamp:             ${result.inspection_timestamp || new Date().toISOString()}
Source Filename:       ${result.image_filename}
Model Architecture:    MobileNetV2 Industrial Transfer Learning
Model Version:         ${result.model_version}

DIAGNOSTIC TELEMETRY:
----------------------------------------------------
Condition Classification:  ${result.predicted_category}
Operational Status:        ${result.healthy_or_defective}
Confidence Score:          ${result.confidence_score?.toFixed(2)}%
Risk Level:                ${result.risk_level || 'Evaluated'}

RECOMMENDED INDUSTRIAL REMEDIATION:
----------------------------------------------------
${result.recommendation}

PROBABILITY DISTRIBUTION (ALL CLASSES):
----------------------------------------------------
${Object.entries(result.class_probabilities || {})
  .sort((a, b) => b[1] - a[1])
  .map(([cls, pct]) => `${cls.padEnd(24)}: ${pct.toFixed(2)}%`)
  .join('\n')}

====================================================
End of Report. Persisted in MongoDB solar_inspection database.
`
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Report_${result.inspection_id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const sortedProbs = Object.entries(result.class_probabilities || {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-6 space-y-6">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#272D36]">
        <div className="flex items-center gap-2">
          <StatusBadge status={result.healthy_or_defective} />
          <span className="text-xs font-mono text-[#8B95A5]">{result.inspection_id}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#8B95A5] font-mono">
          <Cpu className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>{result.model_version}</span>
        </div>
      </div>

      {/* Primary Result Headline */}
      <div>
        <div className="text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider mb-1">
          Detected Condition
        </div>
        <h2 className="text-2xl font-bold text-[#E8EDF4] tracking-tight">
          {result.predicted_category}
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm font-semibold text-[#3B82F6] font-mono">
            {result.confidence_score?.toFixed(1)}% Confidence
          </span>
          <span className="text-xs text-[#8B95A5]">•</span>
          <span className="text-xs text-[#8B95A5]">
            Risk Level: <strong className="text-[#E8EDF4] font-medium">{result.risk_level || 'Moderate'}</strong>
          </span>
        </div>
      </div>

      {/* Diagnostic & Action Cards */}
      <div className="space-y-3">
        <div className="p-3.5 bg-[#1A1F27] border border-[#272D36] rounded-md text-xs leading-relaxed text-[#E8EDF4]">
          <span className="font-semibold text-[#8B95A5] block uppercase tracking-wider text-[10px] mb-1">
            Root Cause Diagnosis
          </span>
          {isHealthy
            ? 'Photovoltaic surface is clean and operating at nominal optical absorption with zero detected anomalies.'
            : isUncertain
            ? 'Prediction confidence is below automated safety threshold (55%). Manual physical inspection by an onsite technician is required to avoid misdiagnosis.'
            : `Surface anomaly consistent with ${result.predicted_category}. Optical or structural impairment detected.`}
        </div>

        <div className="p-3.5 bg-[#3B82F6]/10 border border-[#3B82F6]/25 rounded-md text-xs leading-relaxed text-[#E8EDF4]">
          <div className="flex items-center gap-1.5 font-semibold text-[#3B82F6] uppercase tracking-wider text-[10px] mb-1">
            {isHealthy ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>Recommended Remediation Protocol</span>
          </div>
          {result.recommendation}
        </div>
      </div>

      {/* Probability Distribution Table */}
      <div>
        <div className="text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider mb-3">
          Neural Softmax Probability Distribution
        </div>
        <div className="space-y-2">
          {sortedProbs.map(([className, pct]) => {
            const isTop = className === result.raw_class || className === result.predicted_category
            return (
              <div key={className} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className={isTop ? 'text-[#E8EDF4] font-semibold' : 'text-[#8B95A5]'}>
                    {className}
                  </span>
                  <span className="font-mono text-[11px] text-[#8B95A5]">
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#1A1F27] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTop
                        ? isHealthy
                          ? 'bg-[#22C55E]'
                          : isUncertain
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

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-[#272D36]">
        <button
          onClick={downloadReport}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold bg-[#1A1F27] hover:bg-[#272D36] text-[#E8EDF4] border border-[#272D36] rounded-md transition-colors"
        >
          <Download className="w-4 h-4 text-[#3B82F6]" />
          <span>Download Certified Report</span>
        </button>
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Inspect Another Image</span>
        </button>
      </div>
    </div>
  )
}

