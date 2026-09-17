export interface Warehouse {
  id: number
  code: string
  name: string
  address: string | null
  // Ada di response API (api-documentation.md §4) tapi belum dipetakan di sini sebelumnya —
  // `bu_id` dipakai buat label BU per baris kalau user lihat data lintas-BU (grant/owner,
  // §14 frontend-integration-guide.md), `parent_warehouse_id` buat hierarki gudang utama/cabang.
  bu_id?: number | null
  parent_warehouse_id?: number | null
  created_at: string
  updated_at: string
}

export interface WarehouseInput {
  code: string
  name: string
  address?: string | null
  // null/tidak diisi = warehouse utama; diisi id warehouse utama = warehouse ini jadi cabang-nya
  // (api-documentation.md §4). Parent wajib warehouse utama juga (bukan cabang lain) & bu_id sama
  // — backend yang validasi final, lihat WarehouseFormModal.tsx.
  parent_warehouse_id?: number | null
}

export interface WarehouseStock {
  item_id: number
  sku: string
  name: string
  unit: string
  quantity: number
  min_stock: number
  updated_at: string
}

export interface WarehouseStockSummary {
  warehouse_id: number
  total_items: number
  total_quantity: number
  low_stock_count: number
  out_of_stock_count: number
}
