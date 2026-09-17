export interface Item {
  id: number
  sku: string
  // Beda dari `sku` — barcode itu nilai yang tercetak/discan di kemasan fisik produk, `sku` kode
  // internal (§5 api-documentation.md, 2026-09-13). Nullable & unik kalau diisi.
  barcode: string | null
  name: string
  unit: string
  min_stock: number
  selling_price: string
  // Items sekarang di-scope per BU juga (§15 frontend-integration-guide.md, 2026-09-08) —
  // sebelumnya master data global murni. Dipakai buat label BU per baris kalau user lihat
  // data lintas-BU (grant/owner), sama seperti `bu_id` di Warehouse (§14).
  bu_id?: number | null
  created_at: string
  updated_at: string
}

export interface ItemInput {
  sku: string
  barcode?: string | null
  name: string
  unit: string
  min_stock?: number
  selling_price?: number
}

export interface ItemStock {
  warehouse_id: number
  warehouse_code: string
  warehouse_name: string
  quantity: number
  updated_at: string
}

export interface ItemCost {
  item_id: number
  warehouse_id: number
  quantity_remaining: number
  total_value: string
  average_unit_cost: string
}

export interface ItemCostHistoryEntry {
  id: number
  quantity_received: number
  quantity_remaining: number
  unit_cost: string
  origin_cost_layer_id: number | null
  created_at: string
}

// Import item + stok awal (§25 frontend-integration-guide.md, 2026-09-14).
export interface ItemImportResult {
  rows_processed: number
  items_created: number
  items_updated: number
  warehouses_stocked: number
  // Dokumen INBOUND asli (1 per warehouse yang disentuh) yang otomatis dibikin & COMPLETED buat
  // stok awal — bukan quantity yang muncul misterius tanpa jejak, bisa dibuka lewat
  // `GET /api/inbounds/:id` seperti dokumen inbound biasa.
  inbound_ids: number[]
}

// Bentuk tiap baris `error.details` dari `400 IMPORT_VALIDATION_FAILED` — `row` adalah nomor
// baris ASLI di file termasuk baris header, jadi baris data pertama = `row: 2`.
export interface ImportValidationDetail {
  row: number
  message: string
}
