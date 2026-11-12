import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionService } from '../services/inspectionService'
import { ImageUploader } from '../components/inspection/ImageUploader'
import { PredictionResult } from '../components/inspection/PredictionResult'
import { ErrorState } from '../components/common/ErrorState'
import type { Inspection } from '../types'
import { Scan, ShieldAlert, Cpu } from 'lucide-react'

export const NewInspection: React.FC = () => {
  const [result, setResult] = useState<Inspection | null>(null)
  const queryClient = useQueryClient()

  const inspectionMutation = useMutation({
    mutationFn: ({ file, notes }: { file: File; notes: string }) =>
      inspectionService.createInspection(file, notes),
    onSuccess: (data) => {
      setResult(data)
      // Invalidate queries so dashboard and history immediately show the new record
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] })
      queryClient.invalidateQueries({ queryKey: ['recentInspections'] })
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
    }
  })

  const handleInspect = (file: File, notes: string) => {
    inspectionMutation.mutate({ file, notes })
  }

  const handleReset = () => {
    setResult(null)
    inspectionMutation.reset()
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#3B82F6]/10 text-[#3B82F6] rounded-md">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#E8EDF4]">
              High-Precision Industrial Image Diagnostic
            </div>
            <div className="text-[11px] text-[#8B95A5]">
              MobileNetV2 neural feature extraction with 55% confidence safety gating.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#8B95A5] font-mono">
          <Cpu className="w-4 h-4 text-[#3B82F6]" />
          <span>v2.1.0 • Pretrained Transfer</span>
        </div>
      </div>

      {inspectionMutation.isError && (
        <ErrorState
          title="Inference Processing Error"
          message={inspectionMutation.error.message}
          onRetry={() => inspectionMutation.reset()}
        />
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Image Uploader */}
        <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#272D36]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E8EDF4]">
              Step 1: Ingestion & Validation
            </h3>
            <span className="text-[10px] text-[#8B95A5] font-mono">RGB Normalization</span>
          </div>
          <ImageUploader
            onInspect={handleInspect}
            isLoading={inspectionMutation.isPending}
          />
        </div>

        {/* Right Column: Prediction Result or Instructions */}
        <div>
          {result ? (
            <PredictionResult result={result} onReset={handleReset} />
          ) : (
            <div className="bg-[#15191F] border border-[#272D36] rounded-lg p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#1A1F27] border border-[#272D36] flex items-center justify-center text-[#8B95A5]">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-sm font-semibold text-[#E8EDF4]">
                  Awaiting Solar Panel Image
                </h3>
                <p className="text-xs text-[#8B95A5] leading-relaxed">
                  Upload an aerial or ground-level photovoltaic panel image on the left. The neural classifier will extract features, calculate softmax confidence, and persist the certified audit record into MongoDB.
                </p>
              </div>
              <div className="pt-4 border-t border-[#272D36] flex flex-wrap justify-center gap-2 text-[11px] text-[#8B95A5]">
                <span className="px-2 py-0.5 bg-[#1A1F27] rounded border border-[#272D36]">Clean</span>
                <span className="px-2 py-0.5 bg-[#1A1F27] rounded border border-[#272D36]">Dusty</span>
                <span className="px-2 py-0.5 bg-[#1A1F27] rounded border border-[#272D36]">Bird-drop</span>
                <span className="px-2 py-0.5 bg-[#1A1F27] rounded border border-[#272D36]">Snow-Covered</span>
                <span className="px-2 py-0.5 bg-[#1A1F27] rounded border border-[#272D36]">Electrical-damage</span>
                <span className="px-2 py-0.5 bg-[#1A1F27] rounded border border-[#272D36]">Physical-Damage</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

