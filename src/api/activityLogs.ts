import { apiGet } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { ActivityLog } from '../types/activityLog'

type ListParams = {
  user_id?: number
  warehouse_id?: number
  entity_type?: string
  entity_id?: number
  action?: string
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export function listActivityLogs(params: ListParams) {
  return apiGet<ApiListResponse<ActivityLog>>('/activity-logs', params)
}

export function getActivityLog(id: number) {
  return apiGet<ApiDetailResponse<ActivityLog>>(`/activity-logs/${id}`)
}
