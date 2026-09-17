// §23 frontend-integration-guide.md (2026-09-13) — payment_method sekarang enum wajib di
// backend (nilai teks bebas ditolak 400 VALIDATION_ERROR). Data LAMA yang sempat tersimpan
// sebelum enum ini ada (mis. "Cash"/"transfer") tetap tampil apa adanya di response — enum cuma
// ditegakkan saat menulis data baru, makanya `Payment.payment_method` di bawah tetap `string`
// (bukan `PaymentMethod`) supaya baris lama itu tidak bikin type error, sementara `PaymentInput`
// (dipakai cuma untuk CREATE) tetap dikunci ke `PaymentMethod`.
export type PaymentMethod = 'CASH' | 'QRIS' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'EWALLET' | 'OTHER'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Tunai (Cash)' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'DEBIT', label: 'Kartu Debit' },
  { value: 'CREDIT', label: 'Kartu Kredit' },
  { value: 'TRANSFER', label: 'Transfer Bank' },
  { value: 'EWALLET', label: 'E-Wallet' },
  { value: 'OTHER', label: 'Lainnya' },
]

// Data lama (sebelum enum ini ditegakkan) masih bisa berisi teks bebas seperti "Cash"/"transfer"
// — tampilkan apa adanya kalau tidak cocok satu pun enum yang dikenal. Dipakai di
// `InvoiceDetailPage` (tabel pembayaran per invoice) dan `CashSessionPage` (breakdown per metode).
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method
}

export interface Payment {
  id: number
  payment_number: string
  invoice_id: number
  // Server-resolved (§20 Cash Sessions, 2026-09-13) — terisi otomatis kalau kasir yang mencatat
  // lagi punya sesi kasir OPEN di warehouse invoice ini, `null` kalau tidak ada sesi terbuka.
  // Frontend tidak pernah mengirim field ini.
  cash_session_id: number | null
  amount: string
  // Uang tunai fisik yang diterima (bisa lebih besar dari `amount`) — §21. Sebelum field ini ada,
  // nilainya sama dengan `amount` (pembayaran pas, `change_amount` "0.00").
  amount_tendered: string
  change_amount: string
  payment_method: string
  payment_date: string
  notes: string | null
  created_at: string
}

export interface PaymentInput {
  invoice_id: number
  amount: number
  payment_method: PaymentMethod
  // Opsional — cuma relevan untuk `payment_method: 'CASH'`. Kalau tidak dikirim, backend
  // defaultkan ke `amount` (pembayaran pas, tidak ada kembalian).
  amount_tendered?: number
  payment_date: string
  notes?: string | null
}
