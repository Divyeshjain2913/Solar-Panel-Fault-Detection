import { api } from './api'
import type { ModelPerformance, HealthStatus } from '../types'

export const modelService = {
  async getModelPerformance(): Promise<ModelPerformance> {
    const { data } = await api.get<ModelPerformance>('/api/model/performance')
    return data
  },

  async getModelInfo(): Promise<any> {
    const { data } = await api.get('/api/model/info')
    return data
  },

  async getHealth(): Promise<HealthStatus> {
    const { data } = await api.get<HealthStatus>('/api/health')
    return data
  }
}

