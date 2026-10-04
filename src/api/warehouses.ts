import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { Warehouse, WarehouseInput, WarehouseStock, WarehouseStockSummary } from '../types/warehouse'

// `scope=bu` (backend 2026-10-05): daftar SEMUA warehouse di BU caller, bukan cuma yang
// di-assign — dipakai dropdown tujuan stock transfer (admin-warehouse yang di-assign ke 1
// warehouse tetap harus bisa kirim ke warehouse lain di BU-nya). Default 'assigned'.
export function listWarehouses(params: { page?: number; per_page?: number; scope?: 'assigned' | 'bu' }) {
  return apiGet<ApiListResponse<Warehouse>>('/warehouses', params)
}

export function getWarehouse(id: number) {
  return apiGet<ApiDetailResponse<Warehouse>>(`/warehouses/${id}`)
}

export function createWarehouse(body: WarehouseInput) {
  return apiPost<ApiDetailResponse<Warehouse>>('/warehouses', body)
}

export function updateWarehouse(id: number, body: WarehouseInput) {
  return apiPut<ApiDetailResponse<Warehouse>>(`/warehouses/${id}`, body)
}

export function deleteWarehouse(id: number) {
  return apiDelete<null>(`/warehouses/${id}`)
}

export function listWarehouseStocks(id: number, params: { page?: number; per_page?: number }) {
  return apiGet<ApiListResponse<WarehouseStock>>(`/warehouses/${id}/stocks`, params)
}

export function getWarehouseStockSummary(id: number) {
  return apiGet<ApiDetailResponse<WarehouseStockSummary>>(`/warehouses/${id}/stock-summary`)
}
