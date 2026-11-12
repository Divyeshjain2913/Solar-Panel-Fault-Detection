import { api } from './api'
import type { DashboardMetrics } from '../types'

export const analyticsService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const { data } = await api.get<DashboardMetrics>('/api/dashboard/metrics')
    return data
  },

  async getAnalytics(): Promise<DashboardMetrics> {
    const { data } = await api.get<DashboardMetrics>('/api/analytics')
    return data
  }
}

