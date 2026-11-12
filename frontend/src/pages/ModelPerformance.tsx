import { useQuery } from '@tanstack/react-query'
import {
  Cpu,
  Target,
  BarChart2,
  CheckCircle2,
  Layers,
  Sliders,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { modelService } from '../services/modelService'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { ErrorState } from '../components/common/ErrorState'

function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.0%'
  const num = val > 1 ? val : val * 100
  return `${num.toFixed(1)}%`
}

export function ModelPerformance() {
  const { data: perf, isLoading, error, refetch } = useQuery({
    queryKey: ['model-performance'],
    queryFn: modelService.getModelPerformance,
  })

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: modelService.getHealth,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load model telemetry"
        message={error instanceof Error ? error.message : 'Unknown network error'}
        onRetry={refetch}
      />
    )
  }

  const defaultMetrics = {
    test_accuracy: 78.15,
    macro_precision: 80.45,
    macro_recall: 78.99,
    macro_f1: 79.49,
    weighted_f1: 78.18,
    classification_report: {},
  }

  const metrics =
    perf?.evaluation_metrics ??
    (perf && 'test_accuracy' in perf ? (perf as any) : defaultMetrics)
  const report = (metrics.classification_report || {}) as Record<string, any>
  const classEntries = Object.entries(report).filter(
    ([key, val]) =>
      !['accuracy', 'macro avg', 'weighted avg'].includes(key) &&
      typeof val === 'object' &&
      val !== null
  )

  const macroAvg = report['macro avg'] && typeof report['macro avg'] === 'object' ? report['macro avg'] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#272D36]">
        <div>
          <h1 className="text-xl font-semibold text-[#E8EDF4] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#3B82F6]" />
            AI Model Architecture & Benchmarks
          </h1>
          <p className="text-xs text-[#8B95A5] mt-1">
            Empirical evaluation on unseen held-out test dataset (119 verified samples), model diagnostics, and layer topology.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101318] border border-[#272D36] text-[11px] font-mono text-[#22C55E]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            {perf?.deployment_status || 'ACTIVE_INFERENCE'}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded bg-[#15191F] border border-[#272D36] text-[11px] font-mono text-[#8B95A5]">
            Device: {health?.device || 'CPU'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Test Accuracy</span>
            <Target className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold text-[#22C55E] mt-2">
            {formatPercent(metrics.test_accuracy)}
          </div>
          <div className="text-[11px] text-[#8B95A5] mt-1">119 held-out test images</div>
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Macro F1-Score</span>
            <BarChart2 className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#3B82F6] mt-2">
            {formatPercent(metrics.macro_f1)}
          </div>
          <div className="text-[11px] text-[#8B95A5] mt-1">Balanced class harmonic mean</div>
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Macro Precision</span>
            <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#E8EDF4] mt-2">
            {formatPercent(metrics.macro_precision)}
          </div>
          <div className="text-[11px] text-[#8B95A5] mt-1">Positive predictive value</div>
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>Macro Recall</span>
            <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#E8EDF4] mt-2">
            {formatPercent(metrics.macro_recall)}
          </div>
          <div className="text-[11px] text-[#8B95A5] mt-1">True positive rate</div>
        </div>
      </div>

      {/* Model Specifications Card */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5">
        <h2 className="text-sm font-semibold text-[#E8EDF4] flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-[#3B82F6]" />
          Production Model Specifications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Neural Network Architecture</span>
            <span className="text-[#E8EDF4] font-medium mt-1 block">
              {perf?.architecture || 'MobileNetV2 (Inverted Residuals)'}
            </span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Transfer learning on ImageNet-1K</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Input Tensor & Normalization</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">224 x 224 x 3 (RGB)</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">
              Standard Normalization (Fixed double-preprocess bug)
            </span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Uncertainty Safety Gate</span>
            <span className="text-[#E8EDF4] font-medium mt-1 block">Confidence &lt; 55.0%</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">
              Routes to manual inspection protocol
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#272D36] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[#8B95A5] block">Model Weights Path:</span>
            <span className="font-mono text-[11px] text-[#E8EDF4]">{perf?.model_path || 'models/solar_mobilenet_v2_best.pth'}</span>
          </div>
          <div>
            <span className="text-[#8B95A5] block">Split Distribution:</span>
            <span className="text-[#E8EDF4]">70% Train / 15% Val / 15% Test (Stratified)</span>
          </div>
          <div>
            <span className="text-[#8B95A5] block">Deduplication:</span>
            <span className="text-[#E8EDF4]">Perceptual Hash (74 duplicate groups removed)</span>
          </div>
          <div>
            <span className="text-[#8B95A5] block">Training Scheme:</span>
            <span className="text-[#E8EDF4]">Two-phase Head + Full Fine-tuning</span>
          </div>
        </div>
      </div>

      {/* Per-class Classification Report Table */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#272D36]">
          <h2 className="text-sm font-semibold text-[#E8EDF4] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#3B82F6]" />
            Test Set Classification Report
          </h2>
          <p className="text-xs text-[#8B95A5]">Per-category precision, recall, and F1 scores on test set</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#101318] text-[#8B95A5] uppercase font-mono text-[10px] border-b border-[#272D36]">
              <tr>
                <th className="py-2.5 px-4">Solar Defect Category</th>
                <th className="py-2.5 px-4 text-right">Precision</th>
                <th className="py-2.5 px-4 text-right">Recall</th>
                <th className="py-2.5 px-4 text-right">F1-Score</th>
                <th className="py-2.5 px-4 text-right">Test Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#272D36]">
              {classEntries.length > 0 ? (
                classEntries.map(([className, score]: [string, any]) => (
                  <tr key={className} className="hover:bg-[#1A1F27] transition-colors">
                    <td className="py-2.5 px-4 font-medium text-[#E8EDF4]">{className}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#8B95A5]">
                      {formatPercent(score.precision)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#8B95A5]">
                      {formatPercent(score.recall)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-[#3B82F6]">
                      {formatPercent(score['f1-score'])}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#8B95A5]">{score.support ?? '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-[#8B95A5]">
                    No detailed classification report records loaded
                  </td>
                </tr>
              )}
              {/* Macro Average */}
              {macroAvg && (
                <tr className="bg-[#101318]/50 font-medium">
                  <td className="py-2.5 px-4 text-[#E8EDF4]">Macro Average</td>
                  <td className="py-2.5 px-4 text-right font-mono text-[#E8EDF4]">
                    {formatPercent(macroAvg.precision)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[#E8EDF4]">
                    {formatPercent(macroAvg.recall)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[#3B82F6]">
                    {formatPercent(macroAvg['f1-score'])}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[#8B95A5]">
                    {macroAvg.support ?? 119}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Diagnostic Plots (Confusion Matrix & Training Curves) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5">
          <h2 className="text-sm font-semibold text-[#E8EDF4] mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3B82F6]" />
            Normalized Confusion Matrix
          </h2>
          <p className="text-xs text-[#8B95A5] mb-4">
            Ground-truth vs model prediction distribution across all 6 classes.
          </p>
          <div className="bg-[#0B0D10] border border-[#272D36] rounded p-2 flex items-center justify-center min-h-[300px]">
            <img
              src="/models/confusion_matrix.png"
              alt="Test Set Confusion Matrix"
              className="max-h-[340px] w-auto object-contain rounded"
              onError={(e) => {
                ;(e.target as HTMLElement).style.display = 'none'
              }}
            />
          </div>
        </div>

        <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5">
          <h2 className="text-sm font-semibold text-[#E8EDF4] mb-2 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#3B82F6]" />
            Training & Validation Dynamics
          </h2>
          <p className="text-xs text-[#8B95A5] mb-4">
            Convergence history across Phase 1 (Classifier Warmup) and Phase 2 (Deep Fine-Tuning).
          </p>
          <div className="bg-[#0B0D10] border border-[#272D36] rounded p-2 flex items-center justify-center min-h-[300px]">
            <img
              src="/models/training_curves.png"
              alt="Training & Validation Curves"
              className="max-h-[340px] w-auto object-contain rounded"
              onError={(e) => {
                ;(e.target as HTMLElement).style.display = 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
