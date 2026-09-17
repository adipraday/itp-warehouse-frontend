import { apiGet } from './client'
import type { ApiListResponse } from '../types/common'
import type { Invoice, InvoiceStatus, InvoiceType, PaymentStatus } from '../types/invoice'

type ListParams = {
  type?: InvoiceType
  payment_status?: PaymentStatus
  status?: InvoiceStatus
  warehouse_id?: number
  page?: number
  per_page?: number
}

/**
 * Resource read-only `/api/invoices` (gabungan SALES + PURCHASE, §16 dokumentasi API).
 * Untuk create/update tetap pakai `/api/sales` atau `/api/purchases` (lihat api/invoices.ts).
 */
export function listAllInvoices(params: ListParams) {
  return apiGet<ApiListResponse<Invoice>>('/invoices', params)
}
