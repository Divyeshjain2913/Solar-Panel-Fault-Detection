import { api } from './api'
import type { Inspection, InspectionsResponse } from '../types'

export interface GetInspectionsParams {
  category?: string
  status?: string
  search?: string
  skip?: number
  limit?: number
}

export const inspectionService = {
  async getInspections(params: GetInspectionsParams = {}): Promise<InspectionsResponse> {
    const { data } = await api.get<InspectionsResponse>('/api/inspections', { params })
    return data
  },

  async getInspectionById(id: string): Promise<Inspection> {
    const { data } = await api.get<Inspection>(`/api/inspections/${id}`)
    return data
  },

  async createInspection(file: File, notes: string = ''): Promise<Inspection> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post<Inspection>('/api/inspections', formData, {
      params: { notes },
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data
  },

  async deleteInspection(id: string): Promise<{ status: string; message: string }> {
    const { data } = await api.delete<{ status: string; message: string }>(`/api/inspections/${id}`)
    return data
  }
}

