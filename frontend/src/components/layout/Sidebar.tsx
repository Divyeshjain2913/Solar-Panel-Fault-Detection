import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Scan,
  History,
  BarChart3,
  Cpu,
  Settings,
  Zap,
  Database,
  CheckCircle2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { modelService } from '../../services/modelService'

interface NavItem {
  name: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'New Inspection', to: '/inspect', icon: Scan },
  { name: 'Inspection History', to: '/history', icon: History },
  { name: 'Analytics', to: '/analytics', icon: BarChart3 },
  { name: 'Model Performance', to: '/model', icon: Cpu },
  { name: 'Settings', to: '/settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['healthStatus'],
    queryFn: () => modelService.getHealth(),
    refetchInterval: 15000
  })

  const isDbConnected = health?.database_connected ?? true

  return (
    <aside className="w-64 bg-[#101318] border-r border-[#272D36] flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[#272D36]">
        <div className="p-1.5 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-md text-[#3B82F6]">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-[#E8EDF4]">SolarGuard AI</div>
          <div className="text-[11px] font-medium text-[#8B95A5] uppercase tracking-wider">PV Inspection OS</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-[#8B95A5] uppercase tracking-wider">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#15191F] text-[#3B82F6] border border-[#272D36]'
                    : 'text-[#8B95A5] hover:text-[#E8EDF4] hover:bg-[#15191F]/50 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* System Telemetry Indicator */}
      <div className="p-4 border-t border-[#272D36] bg-[#0B0D10]/50 space-y-2.5">
        <div className="text-[10px] font-semibold text-[#8B95A5] uppercase tracking-wider">
          Telemetry Status
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#8B95A5]">
            <Database className="w-3.5 h-3.5" />
            <span>MongoDB</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-[#22C55E]">
            <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
            {isDbConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#8B95A5]">
            <Cpu className="w-3.5 h-3.5" />
            <span>MobileNetV2</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-[#3B82F6]">
            <CheckCircle2 className="w-3 h-3 text-[#3B82F6]" />
            Active
          </span>
        </div>
      </div>

      {/* User / Version Footer */}
      <div className="px-4 py-3 border-t border-[#272D36] flex items-center justify-between text-[11px] text-[#8B95A5]">
        <span>Enterprise v2.1.0</span>
        <span className="font-mono text-[10px] bg-[#1A1F27] px-1.5 py-0.5 rounded border border-[#272D36]">FastAPI</span>
      </div>
    </aside>
  )
}

