import { apiGet } from './client'
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
