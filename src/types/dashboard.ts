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

export interface DashboardProfit {
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: number
}
