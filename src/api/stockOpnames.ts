import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { StockOpname, StockOpnameInput, StockOpnameStatus } from '../types/stockOpname'

type ListParams = {
  warehouse_id?: number
  status?: StockOpnameStatus
  page?: number
  per_page?: number
}

export function listStockOpnames(params: ListParams) {
  return apiGet<ApiListResponse<StockOpname>>('/stock-opnames', params)
}

export function getStockOpname(id: number) {
  return apiGet<ApiDetailResponse<StockOpname>>(`/stock-opnames/${id}`)
}

export function createStockOpname(body: StockOpnameInput) {
  return apiPost<ApiDetailResponse<StockOpname>>('/stock-opnames', body)
}

export function updateStockOpname(id: number, body: StockOpnameInput) {
  return apiPut<ApiDetailResponse<StockOpname>>(`/stock-opnames/${id}`, body)
}

export function deleteStockOpname(id: number) {
  return apiDelete<null>(`/stock-opnames/${id}`)
}

export function submitStockOpname(id: number) {
  return apiPost<ApiDetailResponse<StockOpname>>(`/stock-opnames/${id}/submit`)
}

export function approveStockOpname(id: number, idempotencyKey: string) {
  return apiPost<ApiDetailResponse<StockOpname>>(`/stock-opnames/${id}/approve`, undefined, {
    idempotencyKey,
  })
}

export function cancelStockOpname(id: number) {
  return apiPost<ApiDetailResponse<StockOpname>>(`/stock-opnames/${id}/cancel`)
}
