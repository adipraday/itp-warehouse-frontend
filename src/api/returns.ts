import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { ReturnDocument, ReturnInput, ReturnStatus, ReturnType } from '../types/return'

type ListParams = {
  warehouse_id?: number
  type?: ReturnType
  status?: ReturnStatus
  page?: number
  per_page?: number
}

export function listReturns(params: ListParams) {
  return apiGet<ApiListResponse<ReturnDocument>>('/returns', params)
}

export function getReturn(id: number) {
  return apiGet<ApiDetailResponse<ReturnDocument>>(`/returns/${id}`)
}

export function createReturn(body: ReturnInput) {
  return apiPost<ApiDetailResponse<ReturnDocument>>('/returns', body)
}

export function updateReturn(id: number, body: ReturnInput) {
  return apiPut<ApiDetailResponse<ReturnDocument>>(`/returns/${id}`, body)
}

export function deleteReturn(id: number) {
  return apiDelete<null>(`/returns/${id}`)
}

export function approveReturn(id: number) {
  return apiPost<ApiDetailResponse<ReturnDocument>>(`/returns/${id}/approve`)
}

export function completeReturn(id: number, idempotencyKey: string) {
  return apiPost<ApiDetailResponse<ReturnDocument>>(`/returns/${id}/complete`, undefined, {
    idempotencyKey,
  })
}

export function rejectReturn(id: number) {
  return apiPost<ApiDetailResponse<ReturnDocument>>(`/returns/${id}/reject`)
}

export function cancelReturn(id: number) {
  return apiPost<ApiDetailResponse<ReturnDocument>>(`/returns/${id}/cancel`)
}
