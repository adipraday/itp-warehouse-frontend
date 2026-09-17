export type InventoryTransactionType = 'INBOUND' | 'OUTBOUND'
export type InventoryTransactionStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED'

export interface InventoryTransactionDetail {
  id: number
  item_id: number
  sku: string
  name: string
  quantity: number
  unit_price: string
  total_price: string
}

export interface InventoryTransactionDetailInput {
  item_id: number
  quantity: number
  unit_price?: number
}

export interface InventoryTransaction {
  id: number
  transaction_number: string
  warehouse_id: number
  contact_id: number | null
  type: InventoryTransactionType
  status: InventoryTransactionStatus
  reversal_of_transaction_id: number | null
  reversal_reason: string | null
  transaction_date: string
  notes: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  // Field audit (frontend-integration-guide.md §8). Inbound/outbound tidak punya tahap approve,
  // jadi approved_by mungkin tidak ada sama sekali di response (bukan cuma null) — opsional.
  created_by?: number | null
  approved_by?: number | null
  completed_by?: number | null
  details?: InventoryTransactionDetail[]
}

export interface InventoryTransactionInput {
  warehouse_id: number
  contact_id?: number | null
  transaction_date: string
  notes?: string | null
  reversal_of_transaction_id?: number | null
  reversal_reason?: string | null
  details: InventoryTransactionDetailInput[]
}
