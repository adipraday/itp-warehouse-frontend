import { apiGet } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { CostLayer, CostSummary } from '../types/costLayer'

type CostLayerListParams = {
  warehouse_id?: number
  item_id?: number
  remaining_only?: boolean
  page?: number
  per_page?: number
}

export function listCostLayers(params: CostLayerListParams) {
  return apiGet<ApiListResponse<CostLayer>>('/cost-layers', params)
}

export function getCostSummary(params: { warehouse_id?: number; from?: string; to?: string }) {
  return apiGet<ApiDetailResponse<CostSummary>>('/cost-summary', params)
}
