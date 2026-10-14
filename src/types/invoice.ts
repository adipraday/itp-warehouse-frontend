export type InvoiceType = 'SALES' | 'PURCHASE'
export type InvoiceStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
// Purchase only: sub-state of a DRAFT purchase that has been handed to the destination warehouse.
// `null`/absent = not submitted yet. (Status invoice sendiri tetap DRAFT/COMPLETED/CANCELLED.)
export type ReceiptStatus = 'PENDING_APPROVAL' | 'PARTIALLY_RECEIVED'

export interface InvoiceDetail {
  id: number
  item_id: number
  sku: string
  name: string
  quantity: number
  // Purchase: sudah masuk stok / ditutup (tidak akan datang, dananya dikembalikan).
  received_quantity?: number
  closed_quantity?: number
  unit_price: string
  amount: string
  unit_cost: string
  cost_amount: string
}

export interface InvoiceDetailInput {
  item_id: number
  quantity: number
  unit_price: number
}

export interface Invoice {
  id: number
  invoice_number: string
  warehouse_id: number
  contact_id: number | null
  type: InvoiceType
  status: InvoiceStatus
  receipt_status?: ReceiptStatus | null
  reversal_of_invoice_id: number | null
  reversal_reason: string | null
  inventory_transaction_id: number | null
  invoice_date: string
  due_date: string | null
  subtotal: string
  // Diskon level transaksi (nominal, bukan persen), diterapkan sebelum pajak — §21
  // frontend-integration-guide.md (2026-09-13). Selalu ada di response (default "0.00").
  discount_amount: string
  tax: string
  tax_rate?: string
  total_amount: string
  payment_status: PaymentStatus
  // Purchase saja (alur persetujuan gudang, 2026-10-14). refund_due = uang yang masih harus
  // dikembalikan supplier (dibayar melebihi total akhir, dikurangi refund yang sudah dicatat).
  paid_amount?: string
  refunded_amount?: string
  refund_due?: string
  supplier_invoice_number?: string | null
  supplier_invoice_file_name?: string | null
  supplier_invoice_file_size?: number | null
  has_supplier_invoice_file?: boolean
  cancel_reason?: string | null
  submitted_at?: string | null
  receipts?: PurchaseReceipt[]
  refunds?: PurchaseRefund[]
  // Hold/resume (§22 frontend-integration-guide.md, 2026-09-13) — SALES-only (tidak ada di
  // Purchase). Sale yang ditahan TETAP berstatus DRAFT seperti biasa, dua field ini cuma penanda
  // tambahan (bukan status baru) — dipakai kasir buat "menahan" cart tanpa kehilangan datanya.
  held_at?: string | null
  hold_label?: string | null
  notes: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  // Field audit (frontend-integration-guide.md §8). Sales/purchase tidak punya tahap approve,
  // jadi approved_by mungkin tidak ada sama sekali di response (bukan cuma null) — opsional.
  created_by?: number | null
  approved_by?: number | null
  completed_by?: number | null
  details?: InvoiceDetail[]
}

export interface PurchaseReceipt {
  id: number
  invoice_id: number
  inventory_transaction_id: number
  received_by: number | null
  received_at: string
  notes: string | null
}

export interface PurchaseRefund {
  id: number
  refund_number: string
  invoice_id: number
  amount: string
  refund_method: string
  refund_date: string
  notes: string | null
  created_by: number | null
  created_at: string
}

export interface InvoiceInput {
  warehouse_id: number
  contact_id?: number | null
  invoice_date: string
  due_date?: string | null
  tax_rate?: number
  // Nominal (bukan persen) — kalau UI nawarin diskon persen, hitung dulu ke nominal sebelum
  // kirim (§21 frontend-integration-guide.md, 2026-09-13). Opsional, default 0 di backend.
  discount_amount?: number
  notes?: string | null
  // Purchase: nomor invoice asli dari supplier (opsional).
  supplier_invoice_number?: string | null
  reversal_of_invoice_id?: number | null
  reversal_reason?: string | null
  details: InvoiceDetailInput[]
}
