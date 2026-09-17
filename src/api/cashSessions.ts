import { apiGet, apiPost } from './client'
import type { ApiDetailResponse } from '../types/common'
import type {
  CashSession,
  CashSessionCloseInput,
  CashSessionExpenseInput,
  CashSessionOpenInput,
} from '../types/cashSession'

// §20 frontend-integration-guide.md (2026-09-13). Tidak ada `Idempotency-Key` di endpoint mana
// pun di sini — open/close/expenses bukan bagian dari daftar aksi yang butuh header itu (§1
// api-documentation.md: cuma `complete`/`approve` pada dokumen transaksional).

// `data: null` (bukan 404) kalau user yang login belum punya sesi OPEN.
export function getCurrentCashSession() {
  return apiGet<ApiDetailResponse<CashSession | null>>('/cash-sessions/current')
}

export function openCashSession(body: CashSessionOpenInput) {
  return apiPost<ApiDetailResponse<CashSession>>('/cash-sessions/open', body)
}

export function closeCashSession(id: number, body: CashSessionCloseInput) {
  return apiPost<ApiDetailResponse<CashSession>>(`/cash-sessions/${id}/close`, body)
}

export function addCashSessionExpense(id: number, body: CashSessionExpenseInput) {
  return apiPost<ApiDetailResponse<CashSession>>(`/cash-sessions/${id}/expenses`, body)
}
