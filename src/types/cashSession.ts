// §20 frontend-integration-guide.md (2026-09-13) — sesi kasir/shift. "Satu sesi = satu buka
// kasir → tutup kasir": kasir input modal awal, sistem lacak semua payment tunai yang masuk
// selama sesi terbuka, kasir input hasil hitung fisik di akhir, sistem hitung selisihnya.
export type CashSessionStatus = 'OPEN' | 'CLOSED'

export interface CashSessionExpense {
  id: number
  amount: string
  description: string
  created_at: string
}

export interface CashSessionMethodBreakdown {
  method: string
  count: number
  amount: string
}

// Selalu ada di response `GET /:id`, `GET /current`, `POST /:id/expenses`, `POST /:id/close` —
// TIDAK ada di response `POST /open` (sesi baru dibuka, belum ada transaksi/pengeluaran apa pun).
export interface CashSessionSummary {
  by_method: CashSessionMethodBreakdown[]
  total_amount: string
  total_count: number
  expenses: CashSessionExpense[]
  total_expenses: string
  // Dihitung live (opening_amount + kas masuk - pengeluaran) — beda dari `expected_cash_amount`
  // di level atas yang cuma terisi setelah sesi CLOSED. Berguna buat preview "kalau ditutup
  // sekarang" selagi status masih OPEN.
  live_expected_cash: string
}

export interface CashSession {
  id: number
  warehouse_id: number
  user_id: number
  status: CashSessionStatus
  opening_amount: string
  closing_amount: string | null
  expected_cash_amount: string | null
  cash_difference: string | null
  opened_at: string
  closed_at: string | null
  notes: string | null
  summary?: CashSessionSummary
}

export interface CashSessionOpenInput {
  warehouse_id: number
  opening_amount?: number
  notes?: string | null
}

export interface CashSessionCloseInput {
  closing_amount: number
  notes?: string | null
}

export interface CashSessionExpenseInput {
  amount: number
  description: string
}

export type CashSessionListParams = {
  warehouse_id?: number
  user_id?: number
  status?: CashSessionStatus
  page?: number
  per_page?: number
}
