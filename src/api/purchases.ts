import { apiDelete, apiGetBlob, apiPost, apiPut } from './client'
import type { ApiDetailResponse } from '../types/common'
import type { Invoice, PurchaseRefund } from '../types/invoice'

// Alur pembelian dengan persetujuan gudang (2026-10-14):
//   DRAFT → dibayar → submit → admin-warehouse tujuan menerima (receive) → COMPLETED
// Hanya `receive` yang menambah stok.

export function submitPurchase(id: number) {
  return apiPost<ApiDetailResponse<Invoice>>(`/purchases/${id}/submit`)
}

export interface ReceiveLine {
  item_id: number
  quantity: number
}

export interface ReceivePurchaseBody {
  // Jumlah yang benar-benar diterima per item; kosong = semua sisa dianggap diterima penuh.
  lines?: ReceiveLine[]
  // Wajib bila masih ada yang kurang: WAIT = tunggu pengganti dari supplier, REFUND = tutup
  // kekurangan dan minta dananya dikembalikan.
  shortfall_action?: 'WAIT' | 'REFUND'
  notes?: string | null
}

export function receivePurchase(id: number, body: ReceivePurchaseBody, idempotencyKey: string) {
  return apiPost<ApiDetailResponse<Invoice>>(`/purchases/${id}/receive`, body, { idempotencyKey })
}

// Alasan wajib bila pembelian sudah dibayar atau sudah diajukan ke gudang.
export function cancelPurchase(id: number, reason?: string) {
  return apiPost<ApiDetailResponse<Invoice>>(`/purchases/${id}/cancel`, reason ? { reason } : {})
}

export interface PurchaseRefundInput {
  amount: number
  refund_method: string
  refund_date: string
  notes?: string | null
}

export function recordPurchaseRefund(id: number, body: PurchaseRefundInput) {
  return apiPost<{ data: PurchaseRefund; purchase: Invoice }>(`/purchases/${id}/refunds`, body)
}

export function updateSupplierInvoiceNumber(id: number, supplierInvoiceNumber: string | null) {
  return apiPut<ApiDetailResponse<Invoice>>(`/purchases/${id}/supplier-invoice`, {
    supplier_invoice_number: supplierInvoiceNumber,
  })
}

export function uploadSupplierInvoiceFile(id: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiPost<ApiDetailResponse<Invoice>>(`/purchases/${id}/supplier-invoice-file`, form)
}

export function downloadSupplierInvoiceFile(id: number) {
  return apiGetBlob(`/purchases/${id}/supplier-invoice-file`)
}

export function deleteSupplierInvoiceFile(id: number) {
  return apiDelete<ApiDetailResponse<Invoice>>(`/purchases/${id}/supplier-invoice-file`)
}
