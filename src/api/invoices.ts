import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { Invoice, InvoiceInput, InvoiceStatus } from '../types/invoice'
import type { Receipt } from '../types/receipt'

export type InvoiceKind = 'sales' | 'purchase'

function basePath(kind: InvoiceKind): string {
  return kind === 'sales' ? '/sales' : '/purchases'
}

type ListParams = {
  warehouse_id?: number
  status?: InvoiceStatus
  // Hold/resume cuma ada di Sales (§22 frontend-integration-guide.md) — pemanggil (list page)
  // sengaja tidak pernah kirim field ini untuk kind Purchase, biar tidak bergantung pada asumsi
  // backend meloloskan/mengabaikan query yang tidak dikenal.
  held?: boolean
  page?: number
  per_page?: number
}

export function listInvoicesByKind(kind: InvoiceKind, params: ListParams) {
  return apiGet<ApiListResponse<Invoice>>(basePath(kind), params)
}

export function getInvoiceByKind(kind: InvoiceKind, id: number) {
  return apiGet<ApiDetailResponse<Invoice>>(`${basePath(kind)}/${id}`)
}

export function createInvoiceByKind(kind: InvoiceKind, body: InvoiceInput) {
  return apiPost<ApiDetailResponse<Invoice>>(basePath(kind), body)
}

export function updateInvoiceByKind(kind: InvoiceKind, id: number, body: InvoiceInput) {
  return apiPut<ApiDetailResponse<Invoice>>(`${basePath(kind)}/${id}`, body)
}

export function deleteInvoiceByKind(kind: InvoiceKind, id: number) {
  return apiDelete<null>(`${basePath(kind)}/${id}`)
}

export function completeInvoiceByKind(kind: InvoiceKind, id: number, idempotencyKey: string) {
  return apiPost<ApiDetailResponse<Invoice>>(`${basePath(kind)}/${id}/complete`, undefined, {
    idempotencyKey,
  })
}

export function cancelInvoiceByKind(kind: InvoiceKind, id: number) {
  return apiPost<ApiDetailResponse<Invoice>>(`${basePath(kind)}/${id}/cancel`)
}

// Hold/resume (§22 frontend-integration-guide.md, 2026-09-13) — SALES-only, tidak ada endpoint
// setara di Purchase, makanya bukan "ByKind" seperti fungsi lain di atas. Tidak butuh
// Idempotency-Key (transisi ini tidak berdampak stok — sale-nya tetap DRAFT).
export function holdSale(id: number, holdLabel?: string) {
  return apiPost<ApiDetailResponse<Invoice>>(`/sales/${id}/hold`, holdLabel ? { hold_label: holdLabel } : {})
}

export function resumeSale(id: number) {
  return apiPost<ApiDetailResponse<Invoice>>(`/sales/${id}/resume`)
}

// Cetak struk (§19 frontend-integration-guide.md, 2026-09-13) — SALES-only juga. Cuma bisa buat
// sale COMPLETED (`409 INVALID_STATUS` kalau masih DRAFT) — pemanggil yang jaga gating itu di UI
// (tombol cuma muncul buat sale COMPLETED), backend tetap validator akhir yang sebenarnya.
export function getSaleReceipt(id: number, paperWidthMm?: 58 | 80) {
  return apiGet<ApiDetailResponse<Receipt>>(
    `/sales/${id}/receipt`,
    paperWidthMm != null ? { paper_width_mm: paperWidthMm } : undefined,
  )
}
