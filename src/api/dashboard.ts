import { apiGet } from './client'
import type { ApiDetailResponse } from '../types/common'
import type {
  DashboardInvoiceSummary,
  DashboardProfit,
  DashboardSalesTrendPoint,
  DashboardStockSummary,
  DashboardSummary,
} from '../types/dashboard'

export function getDashboardSummary(params: { warehouse_id?: number; date?: string }) {
  return apiGet<ApiDetailResponse<DashboardSummary>>('/dashboard/summary', params)
}

export function getDashboardStock(params: { warehouse_id?: number }) {
  return apiGet<ApiDetailResponse<DashboardStockSummary>>('/dashboard/stock', params)
}

export function getDashboardSales(params: { warehouse_id?: number; from?: string; to?: string }) {
  return apiGet<ApiDetailResponse<DashboardInvoiceSummary>>('/dashboard/sales', params)
}

export function getDashboardSalesTrend(params: { warehouse_id?: number; from?: string; to?: string }) {
  return apiGet<ApiDetailResponse<DashboardSalesTrendPoint[]>>('/dashboard/sales-trend', params)
}

export function getDashboardPurchases(params: { warehouse_id?: number; from?: string; to?: string }) {
  return apiGet<ApiDetailResponse<DashboardInvoiceSummary>>('/dashboard/purchases', params)
}

export function getDashboardProfit(params: { warehouse_id?: number; from?: string; to?: string }) {
  return apiGet<ApiDetailResponse<DashboardProfit>>('/dashboard/profit', params)
}
