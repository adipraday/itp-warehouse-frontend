import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { StockTransfer, StockTransferInput, StockTransferStatus } from '../types/stockTransfer'

type ListParams = {
  source_warehouse_id?: number
  destination_warehouse_id?: number
  status?: StockTransferStatus
  page?: number
  per_page?: number
}

export function listStockTransfers(params: ListParams) {
  return apiGet<ApiListResponse<StockTransfer>>('/stock-transfers', params)
}

export function getStockTransfer(id: number) {
  return apiGet<ApiDetailResponse<StockTransfer>>(`/stock-transfers/${id}`)
}

export function createStockTransfer(body: StockTransferInput) {
  return apiPost<ApiDetailResponse<StockTransfer>>('/stock-transfers', body)
}

export function updateStockTransfer(id: number, body: StockTransferInput) {
  return apiPut<ApiDetailResponse<StockTransfer>>(`/stock-transfers/${id}`, body)
}

export function deleteStockTransfer(id: number) {
  return apiDelete<null>(`/stock-transfers/${id}`)
}

export function approveStockTransfer(id: number) {
  return apiPost<ApiDetailResponse<StockTransfer>>(`/stock-transfers/${id}/approve`)
}

export function completeStockTransfer(id: number, idempotencyKey: string) {
  return apiPost<ApiDetailResponse<StockTransfer>>(`/stock-transfers/${id}/complete`, undefined, {
    idempotencyKey,
  })
}

export function cancelStockTransfer(id: number) {
  return apiPost<ApiDetailResponse<StockTransfer>>(`/stock-transfers/${id}/cancel`)
}
