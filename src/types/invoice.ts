export type InvoiceType = 'SALES' | 'PURCHASE'
export type InvoiceStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'

export interface InvoiceDetail {
  id: number
  item_id: number
  sku: string
  name: string
  quantity: number
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
  total_amount: string
  payment_status: PaymentStatus
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
  reversal_of_invoice_id?: number | null
  reversal_reason?: string | null
  details: InvoiceDetailInput[]
}
