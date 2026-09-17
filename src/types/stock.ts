export interface Stock {
  id: number
  warehouse_id: number
  warehouse_code: string
  warehouse_name: string
  item_id: number
  sku: string
  item_name: string
  unit: string
  min_stock: number
  quantity: number
  updated_at: string
}
