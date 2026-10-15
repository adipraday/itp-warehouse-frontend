import { apiGet, apiGetBlob } from './client'
import type { ApiListResponse } from '../types/common'
import type { Stock } from '../types/stock'

type StockListParams = {
  warehouse_id?: number
  item_id?: number
  page?: number
  per_page?: number
}

export function listStocks(params: StockListParams) {
  return apiGet<ApiListResponse<Stock>>('/stocks', params)
}

export function listLowStock(params: Omit<StockListParams, 'item_id'>) {
  return apiGet<ApiListResponse<Stock>>('/stocks/low-stock', params)
}

export function listOutOfStock(params: Omit<StockListParams, 'item_id'>) {
  return apiGet<ApiListResponse<Stock>>('/stocks/out-of-stock', params)
}

export type StockExportFormat = 'csv' | 'xlsx' | 'pdf'
export type StockExportStatus = 'all' | 'low' | 'out'

// Export data stok (2026-10-15): balikin file beneran (bukan JSON), makanya lewat `apiGetBlob`. `status`
// memakai definisi yang sama dengan endpoint low-stock / out-of-stock, jadi isi file selalu cocok dengan
// angka di tab; tanpa paginasi (semua baris sekaligus). Tidak ada filter item — hanya status + warehouse.
export function exportStocks(params: { status?: StockExportStatus; format?: StockExportFormat; warehouse_id?: number }) {
  return apiGetBlob('/stocks/export', params)
}
