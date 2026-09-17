export interface CostLayer {
  id: number
  warehouse_id: number
  item_id: number
  source_stock_mutation_id: number
  origin_cost_layer_id: number | null
  quantity_received: number
  quantity_remaining: number
  unit_cost: string
  created_at: string
}

export interface CostSummary {
  quantity_remaining: number
  total_value: string
}
