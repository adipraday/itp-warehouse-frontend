import { apiGet } from './client'
import type { ApiDetailResponse } from '../types/common'
import type {
  Aging,
  AgingSide,
  BranchComparison,
  CashVariance,
  DashboardInvoiceSummary,
  DashboardProfit,
  DashboardSalesTrendPoint,
  DashboardStockSummary,
  DashboardSummary,
  StuckQueue,
  UnusualActivity,
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

// Pemantauan lintas cabang — hanya super-admin/owner/admin-bu (403 untuk role lain).
export function getBranchComparison(params: { from?: string; to?: string }) {
  return apiGet<ApiDetailResponse<BranchComparison>>('/dashboard/branches', params)
}

export function getCashVariance(params: {
  from?: string
  to?: string
  warehouse_id?: number
  min_abs_difference?: number
  limit?: number
}) {
  return apiGet<ApiDetailResponse<CashVariance>>('/dashboard/cash-variance', params)
}

export function getStuckQueue(params: { min_age_days?: number; warehouse_id?: number; limit?: number }) {
  return apiGet<ApiDetailResponse<StuckQueue>>('/dashboard/stuck-queue', params)
}

export function getAging(params: { side: AgingSide; warehouse_id?: number; limit?: number }) {
  return apiGet<ApiDetailResponse<Aging>>('/dashboard/aging', params)
}

export function getUnusualActivity(params: { from?: string; to?: string }) {
  return apiGet<ApiDetailResponse<UnusualActivity>>('/dashboard/unusual-activity', params)
}
