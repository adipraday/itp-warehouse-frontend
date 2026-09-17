import { apiGet } from './client'
import type { ApiListResponse } from '../types/common'
import type {
  StockMutation,
  StockMutationDirection,
  StockMutationSourceType,
  StockMutationType,
} from '../types/stockMutation'

type StockMutationListParams = {
  warehouse_id?: number
  item_id?: number
  type?: StockMutationType
  direction?: StockMutationDirection
  source_type?: StockMutationSourceType
  source_id?: number
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export function listStockMutations(params: StockMutationListParams) {
  return apiGet<ApiListResponse<StockMutation>>('/stock-mutations', params)
}
