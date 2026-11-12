import React from 'react'
import { useLocation } from 'react-router-dom'
import { RotateCw, ShieldCheck, User } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Industrial Inspection Dashboard', subtitle: 'Live photovoltaic telemetry and anomaly detection overview' },
  '/inspect': { title: 'Automated Image Inspection', subtitle: 'Real-time neural surface defect classification and reporting' },
  '/history': { title: 'Persistent Inspection History', subtitle: 'Audit log of verified module diagnostics stored in MongoDB' },
  '/analytics': { title: 'Telemetry & Anomaly Analytics', subtitle: 'Statistical aggregations and defect distributions' },
  '/model': { title: 'Model Performance & Telemetry', subtitle: 'Verified evaluation metrics on held-out test datasets' },
  '/settings': { title: 'Platform Settings & Diagnostics', subtitle: 'MongoDB connection parameters and inference thresholds' }
}

export const Header: React.FC = () => {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Handle dynamic paths like /history/:id
  let routeInfo = routeTitles[location.pathname]
  if (!routeInfo && location.pathname.startsWith('/history/')) {
    routeInfo = { title: 'Inspection Diagnostic Detail', subtitle: 'Comprehensive report and class probability telemetry' }
  } else if (!routeInfo) {
    routeInfo = { title: 'SolarGuard AI', subtitle: 'PV Defect Inspection System' }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <header className="h-16 bg-[#101318]/90 backdrop-blur-md border-b border-[#272D36] flex items-center justify-between px-6 shrink-0 z-10">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-sm font-semibold text-[#E8EDF4] tracking-tight">{routeInfo.title}</h1>
        <p className="text-[11px] text-[#8B95A5]">{routeInfo.subtitle}</p>
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-3">
        {/* Operational Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-md text-[11px] font-medium text-[#22C55E]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>System Operational</span>
        </div>

        {/* Refresh Action */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh telemetry"
          className="p-1.5 bg-[#15191F] hover:bg-[#1A1F27] text-[#8B95A5] hover:text-[#E8EDF4] border border-[#272D36] rounded-md transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#3B82F6]' : ''}`} />
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#272D36]">
          <div className="w-7 h-7 rounded-full bg-[#1A1F27] border border-[#272D36] flex items-center justify-center text-[#8B95A5]">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-[11px] font-medium text-[#E8EDF4]">Field Engineer</div>
            <div className="text-[10px] text-[#8B95A5]">O&M Division</div>
          </div>
        </div>
      </div>
    </header>
  )
}

