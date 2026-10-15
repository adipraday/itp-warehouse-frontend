export interface CostLayer {
  id: number
  warehouse_id: number
  item_id: number
  // Item di balik item_id (SKU dan nama), disertakan backend sejak 2026-10-15.
  sku?: string | null
  item_name?: string | null
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
