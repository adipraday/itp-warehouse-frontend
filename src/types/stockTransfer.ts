export type StockTransferStatus = 'DRAFT' | 'APPROVED' | 'COMPLETED' | 'CANCELLED'

export interface StockTransferDetail {
  id: number
  item_id: number
  sku: string
  name: string
  quantity: number
}

export interface StockTransferDetailInput {
  item_id: number
  quantity: number
}

export interface StockTransfer {
  id: number
  transfer_number: string
  source_warehouse_id: number
  destination_warehouse_id: number
  status: StockTransferStatus
  reversal_of_transfer_id: number | null
  reversal_reason: string | null
  transfer_date: string
  notes: string | null
  approved_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  // Field audit (frontend-integration-guide.md §8).
  created_by?: number | null
  approved_by?: number | null
  completed_by?: number | null
  details?: StockTransferDetail[]
}

export interface StockTransferInput {
  source_warehouse_id: number
  destination_warehouse_id: number
  transfer_date: string
  notes?: string | null
  reversal_of_transfer_id?: number | null
  reversal_reason?: string | null
  details: StockTransferDetailInput[]
}
