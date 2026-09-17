export type StockOpnameStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CANCELLED'

export interface StockOpnameDetail {
  id: number
  item_id: number
  sku: string
  name: string
  system_qty: number
  physical_qty: number
  difference: number
  notes: string | null
}

export interface StockOpnameDetailInput {
  item_id: number
  physical_qty: number
  notes?: string | null
}

export interface StockOpname {
  id: number
  opname_number: string
  warehouse_id: number
  opname_date: string
  status: StockOpnameStatus
  reversal_of_stock_opname_id: number | null
  reversal_reason: string | null
  notes: string | null
  submitted_at: string | null
  approved_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  // Field audit (frontend-integration-guide.md §8).
  created_by?: number | null
  approved_by?: number | null
  completed_by?: number | null
  details?: StockOpnameDetail[]
}

export interface StockOpnameInput {
  warehouse_id: number
  opname_date: string
  notes?: string | null
  reversal_of_stock_opname_id?: number | null
  reversal_reason?: string | null
  details: StockOpnameDetailInput[]
}
