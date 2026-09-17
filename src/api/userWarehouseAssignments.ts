import { apiGet, apiPost, apiDelete } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { WarehouseAssignment, WarehouseAssignmentInput } from '../types/warehouseAssignment'

export function listAssignments(params: { user_id?: number; warehouse_id?: number }) {
  return apiGet<ApiListResponse<WarehouseAssignment>>('/user-warehouse-assignments', params)
}

/** 409 ASSIGNMENT_EXISTS kalau pasangan user_id+warehouse_id ini sudah ada. */
export function createAssignment(body: WarehouseAssignmentInput) {
  return apiPost<ApiDetailResponse<WarehouseAssignment>>('/user-warehouse-assignments', body)
}

/** id di sini adalah id assignment (baris di tabel), BUKAN user_id. */
export function deleteAssignment(id: number) {
  return apiDelete<null>(`/user-warehouse-assignments/${id}`)
}
