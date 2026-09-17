import { apiGet, apiGetBlob, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { Item, ItemCost, ItemCostHistoryEntry, ItemImportResult, ItemInput, ItemStock } from '../types/item'

export type ExportFormat = 'csv' | 'xlsx'

export function listItems(params: { page?: number; per_page?: number }) {
  return apiGet<ApiListResponse<Item>>('/items', params)
}

export function searchItems(params: { q: string; page?: number; per_page?: number }) {
  return apiGet<ApiListResponse<Item>>('/items/search', params)
}

// §18 frontend-integration-guide.md (2026-09-13) — lookup exact-match buat scanner barcode kasir.
// `warehouse_id` opsional; kalau dikirim, response ikut kasih stok item itu di warehouse tsb
// (`stock: {warehouse_id, quantity}`) jadi 1x request per scan. 404 kalau barcode tidak ketemu —
// pemanggil (form transaksi) yang nawarin "Daftarkan produk baru", bukan tanggung jawab di sini.
export function getItemByBarcode(barcode: string, warehouseId?: number) {
  return apiGet<ApiDetailResponse<Item & { stock?: { warehouse_id: number; quantity: number } }>>(
    `/items/by-barcode/${encodeURIComponent(barcode)}`,
    warehouseId != null ? { warehouse_id: warehouseId } : undefined,
  )
}

export function getItem(id: number) {
  return apiGet<ApiDetailResponse<Item>>(`/items/${id}`)
}

export function createItem(body: ItemInput) {
  return apiPost<ApiDetailResponse<Item>>('/items', body)
}

export function updateItem(id: number, body: ItemInput) {
  return apiPut<ApiDetailResponse<Item>>(`/items/${id}`, body)
}

export function listItemStocks(id: number, params: { warehouse_id?: number; page?: number; per_page?: number }) {
  return apiGet<ApiListResponse<ItemStock>>(`/items/${id}/stocks`, params)
}

export function getItemCost(id: number, params: { warehouse_id: number }) {
  return apiGet<ApiDetailResponse<ItemCost>>(`/items/${id}/cost`, params)
}

export function getItemCostHistory(
  id: number,
  params: { warehouse_id: number; page?: number; per_page?: number },
) {
  return apiGet<ApiListResponse<ItemCostHistoryEntry>>(`/items/${id}/cost-history`, params)
}

// Import item + stok awal (§25 frontend-integration-guide.md, 2026-09-14) — `multipart/form-data`,
// bukan JSON. Butuh caller yang punya home BU tunggal (admin-bu/purchasing) — super-admin ditolak
// `400 BU_REQUIRED` (tidak ada BU tunggal yang jelas jadi tujuan import), jadi UI pemanggil
// sebaiknya sembunyikan tombol ini buat super-admin, bukan cuma andalkan penolakan backend.
export function importItems(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiPost<ApiDetailResponse<ItemImportResult>>('/items/import', formData)
}

// Template kosong (cuma baris header) — biar user tau format kolom yang benar sebelum isi data
// sungguhan (§26). Balikin file beneran, bukan JSON, makanya lewat `apiGetBlob` bukan `apiGet`.
export function downloadItemsImportTemplate(format: ExportFormat = 'csv') {
  return apiGetBlob('/items/import/template', { format })
}

// Export kolomnya SENGAJA beda dari kolom import (tidak ada `quantity`/`unit_cost`) — biar
// export-lalu-reimport-langsung aman, tidak bikin stok dobel keitung (§26, penjelasan lengkap
// ditampilkan di UI halaman import/export, bukan cuma di komentar ini).
export function exportItems(params: { format?: ExportFormat; warehouse_id?: number }) {
  return apiGetBlob('/items/export', params)
}
