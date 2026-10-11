export interface DashboardStockSummary {
  total_items: number
  total_quantity: number
  total_value: string
  low_stock_count: number
  out_of_stock_count: number
}

export interface DashboardInvoiceSummary {
  count: number
  subtotal: string
  tax: string
  total_amount: string
}

export interface DashboardSummary {
  date: string
  stock: DashboardStockSummary
  sales: DashboardInvoiceSummary
  purchases: DashboardInvoiceSummary
}

// Satu baris per tanggal — tanggal tanpa transaksi TIDAK muncul di array (bukan diisi 0).
// Lihat docs/frontend-integration-guide.md §27 (warehouse-system-api) buat detailnya.
export interface DashboardSalesTrendPoint {
  date: string
  count: number
  subtotal: string
  tax: string
  total_amount: string
}

export interface DashboardProfit {
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: number
}

// ---- Pemantauan lintas cabang (owner / admin-bu / super-admin) --------------------------------
// GET /dashboard/branches dan /dashboard/cash-variance (warehouse-backend, 2026-10-12). Semua
// field uang berupa string desimal; persentase berupa number (growth `null` = periode lalu tanpa
// penjualan, jadi tidak ada pembanding).

export interface BranchPerformance {
  warehouse_id: number
  code: string
  name: string
  bu_id: number | null
  sales_count: number
  sales_total: string
  previous_sales_total: string
  sales_growth_pct: number | null
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: number
  stock_value: string
  low_stock_count: number
  out_of_stock_count: number
}

export interface BranchComparison {
  period: { from: string; to: string; previous_from: string; previous_to: string }
  totals: {
    sales_count: number
    sales_total: string
    previous_sales_total: string
    sales_growth_pct: number | null
    revenue: string
    gross_profit: string
    gross_margin_pct: number
    stock_value: string
    low_stock_count: number
    out_of_stock_count: number
  }
  branches: BranchPerformance[]
}

export interface CashVarianceSession {
  id: number
  warehouse_id: number
  user_id: number
  opened_at: string
  closed_at: string
  opening_amount: string
  expected_cash_amount: string
  closing_amount: string
  cash_difference: string
  notes: string | null
}

export interface CashVarianceWarehouse {
  warehouse_id: number
  sessions_closed: number
  sessions_with_variance: number
  shortage: string
  overage: string
  net: string
}

export interface OverdueOpenSession {
  id: number
  warehouse_id: number
  user_id: number
  opened_at: string
  opening_amount: string
}

export interface CashVariance {
  period: { from: string; to: string }
  min_abs_difference: string
  summary: {
    sessions_closed: number
    sessions_with_variance: number
    total_shortage: string
    total_overage: string
    net_difference: string
    overdue_open_count: number
  }
  by_warehouse: CashVarianceWarehouse[]
  sessions: CashVarianceSession[]
  overdue_open_sessions: OverdueOpenSession[]
}

// ---- Antrean macet (GET /dashboard/stuck-queue) -----------------------------------------------
// Dokumen yang berada di status "ada yang harus bertindak". `age_days` = hari bisnis (WIB) sejak
// `waiting_since`. `group` mengelompokkan jenisnya untuk ringkasan.
export type StuckQueueGroup = 'approval' | 'completion' | 'draft' | 'held'

export type StuckQueueKind =
  | 'transfer_pending_approval'
  | 'transfer_pending_completion'
  | 'opname_pending_submission'
  | 'opname_pending_approval'
  | 'return_pending_approval'
  | 'return_pending_completion'
  | 'sale_held'
  | 'sale_draft'
  | 'purchase_draft'
  | 'inbound_draft'
  | 'outbound_draft'

export interface StuckQueueItem {
  kind: StuckQueueKind
  group: StuckQueueGroup
  document_id: number
  document_number: string
  warehouse_id: number
  to_warehouse_id: number | null
  status: string
  waiting_since: string
  age_days: number
  created_by: number | null
}

export interface StuckQueue {
  min_age_days: number
  as_of: string
  summary: {
    total: number
    by_group: Record<StuckQueueGroup, number>
    by_kind: Record<StuckQueueKind, number>
    // true = daftar `items` dipotong limit; angka di summary tetap lengkap.
    truncated: boolean
  }
  items: StuckQueueItem[]
}
