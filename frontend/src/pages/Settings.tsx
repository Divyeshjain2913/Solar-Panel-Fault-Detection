import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Settings as SettingsIcon,
  Database,
  Cpu,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { modelService } from '../services/modelService'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'

export function Settings() {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ['system-health-settings'],
    queryFn: modelService.getHealth,
  })

  const { data: modelInfo } = useQuery({
    queryKey: ['model-info-settings'],
    queryFn: modelService.getModelInfo,
  })

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await modelService.getHealth()
      if (res.database_connected) {
        setTestResult({
          success: true,
          message: `Connected successfully to MongoDB database. Engine: ${res.device}, Model: ${res.model_version}`,
        })
      } else {
        setTestResult({
          success: false,
          message: 'Backend reached but MongoDB connection is currently disconnected.',
        })
      }
      refetch()
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to communicate with FastAPI backend server.',
      })
    } finally {
      setTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-24 w-full" />
        <LoadingSkeleton className="h-48 w-full" />
        <LoadingSkeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#272D36]">
        <div>
          <h1 className="text-xl font-semibold text-[#E8EDF4] flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#3B82F6]" />
            System Configuration & Diagnostics
          </h1>
          <p className="text-xs text-[#8B95A5] mt-1">
            Operational status, database topology, machine learning pipeline, and storage subsystems.
          </p>
        </div>
        <div>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-xs font-medium text-white rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Test Result Toast/Banner */}
      {testResult && (
        <div
          className={`p-3 rounded border text-xs flex items-center gap-2 ${
            testResult.success
              ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
              : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Database Diagnostics */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#3B82F6]" />
            <h2 className="text-sm font-semibold text-[#E8EDF4]">Primary Persistent Database</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono ${
              health?.database_connected
                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                health?.database_connected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
              }`}
            />
            {health?.database_connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Database Engine</span>
            <span className="text-[#E8EDF4] font-medium mt-1 block">MongoDB Enterprise / Community</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Driver: PyMongo v4.11</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Default Host & Port</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">127.0.0.1:27017</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Configurable via MONGODB_URI</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Primary Collections</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">inspections, daily_analytics</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Indexed on inspection_id & timestamp</span>
          </div>
        </div>
      </div>

      {/* Model & Inference Engine */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#3B82F6]" />
            <h2 className="text-sm font-semibold text-[#E8EDF4]">Inference Engine & Deep Learning Pipeline</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono ${
              health?.model_loaded
                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                health?.model_loaded ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
              }`}
            />
            {health?.model_loaded ? 'LOADED & READY' : 'OFFLINE'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Active Model Weights</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">
              {modelInfo?.model_path || 'models/solar_mobilenet_v2_best.pth'}
            </span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">PyTorch MobileNetV2 Checkpoint</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Execution Hardware</span>
            <span className="text-[#E8EDF4] font-medium mt-1 block">
              {health?.device?.toUpperCase() || 'CPU'}
            </span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Torchvision tensor transforms</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Safety Threshold</span>
            <span className="text-[#E8EDF4] font-medium mt-1 block">&lt; 55% Confidence</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Enforces manual inspection protocol</span>
          </div>
        </div>
      </div>

      {/* Backend & Environment Specifications */}
      <div className="bg-[#15191F] border border-[#272D36] rounded-md p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[#3B82F6]" />
          <h2 className="text-sm font-semibold text-[#E8EDF4]">Backend Server Environment</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">FastAPI Server</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">v0.115+</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Uvicorn ASGI runtime</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Backend Port</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">127.0.0.1:8000</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Reverse proxied by Vite</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">Upload Persistence</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">data/uploads/</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Static image asset serving</span>
          </div>

          <div className="p-3 bg-[#101318] rounded border border-[#272D36]">
            <span className="text-[#8B95A5] block">UI Framework</span>
            <span className="text-[#E8EDF4] font-mono mt-1 block">React 19 + Vite + TS</span>
            <span className="text-[11px] text-[#8B95A5] mt-0.5 block">Tailwind CSS v4</span>
          </div>
        </div>
      </div>
    </div>
  )
}
