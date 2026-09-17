export type ReturnType = 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER'
export type ReturnStatus = 'DRAFT' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
export type ReturnCondition = 'GOOD' | 'DAMAGED'
export type ReturnAction = 'RESTOCK' | 'REPLACE' | 'SCRAP'

export interface ReturnDetail {
  id: number
  item_id: number
  sku: string
  name: string
  quantity: number
  condition: ReturnCondition
  action: ReturnAction
  unit_cost: string
  total_cost: string
}

export interface ReturnDetailInput {
  item_id: number
  quantity: number
  condition: ReturnCondition
  action: ReturnAction
}

export interface ReturnDocument {
  id: number
  return_number: string
  warehouse_id: number
  contact_id: number
  type: ReturnType
  original_invoice_id: number | null
  original_inventory_transaction_id: number | null
  replacement_inventory_transaction_id: number | null
  status: ReturnStatus
  reversal_of_return_id: number | null
  reversal_reason: string | null
  return_date: string
  reason: string | null
  approved_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  // Field audit (frontend-integration-guide.md §8).
  created_by?: number | null
  approved_by?: number | null
  completed_by?: number | null
  details?: ReturnDetail[]
}

export interface ReturnInput {
  warehouse_id: number
  contact_id: number
  type: ReturnType
  original_invoice_id?: number | null
  original_inventory_transaction_id?: number | null
  return_date: string
  reason?: string | null
  details: ReturnDetailInput[]
}
