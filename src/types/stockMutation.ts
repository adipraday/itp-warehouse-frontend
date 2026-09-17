export type StockMutationType = 'IN' | 'OUT' | 'RETURN_IN' | 'RETURN_OUT' | 'ADJUSTMENT'
export type StockMutationDirection = 'IN' | 'OUT'
export type StockMutationSourceType = 'INVENTORY_TRANSACTION' | 'RETURN' | 'STOCK_OPNAME' | 'STOCK_TRANSFER'

export interface StockMutation {
  id: number
  warehouse_id: number
  item_id: number
  type: StockMutationType
  direction: StockMutationDirection
  quantity: number
  total_cost: string
  source_type: StockMutationSourceType
  source_id: number
  inventory_transaction_id: number | null
  return_id: number | null
  stock_opname_id: number | null
  stock_transfer_id: number | null
  occurred_at: string
  created_at: string
}
