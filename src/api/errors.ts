import type { ApiErrorBody } from '../types/common'

export class ApiError extends Error {
  code: string
  status: number
  details: unknown[]

  constructor(body: ApiErrorBody, status: number) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
    this.details = body.details
  }
}

/**
 * Pesan fallback per kode error (§2 Referensi Kode Error di api-documentation.md).
 * Dipakai kalau mau tampilkan pesan yang lebih ramah daripada `message` mentah dari backend.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Data yang dikirim tidak valid. Periksa kembali form.',
  REVERSAL_REASON_REQUIRED: 'Alasan reversal wajib diisi.',
  INVALID_REVERSAL_TARGET: 'Dokumen target reversal tidak valid atau belum selesai.',
  SAME_WAREHOUSE: 'Gudang asal dan tujuan tidak boleh sama.',
  EXACTLY_ONE_ORIGIN_REQUIRED: 'Pilih tepat satu dokumen asal untuk retur ini.',
  INVALID_ORIGIN_FOR_TYPE: 'Dokumen asal tidak cocok dengan tipe retur.',
  INVALID_ORIGIN_DOCUMENT: 'Dokumen asal tidak ditemukan atau belum selesai.',
  DAMAGED_MUST_BE_SCRAPPED: 'Barang dengan kondisi rusak harus diproses sebagai SCRAP.',
  INVALID_REPLACE_ACTION: 'Aksi ganti barang hanya berlaku untuk retur customer kondisi baik.',
  ITEM_NOT_ON_ORIGINAL_DOCUMENT: 'Item ini tidak ada di dokumen asal.',
  NOT_FOUND: 'Data tidak ditemukan.',
  WAREHOUSE_CODE_EXISTS: 'Kode gudang sudah dipakai.',
  WAREHOUSE_REFERENCED: 'Gudang masih dipakai data lain, tidak bisa dihapus.',
  ITEM_SKU_EXISTS: 'SKU sudah dipakai.',
  IDEMPOTENCY_KEY_REUSED: 'Aksi ini sudah pernah diproses dengan data berbeda. Coba ulangi dari awal.',
  INVALID_STATUS: 'Status dokumen saat ini tidak mendukung aksi ini.',
  INSUFFICIENT_STOCK: 'Stok tidak mencukupi untuk transaksi ini.',
  FIFO_ALLOCATION_MISMATCH: 'Terjadi kesalahan alokasi stok internal. Hubungi admin.',
  RETURN_QUANTITY_EXCEEDS_ELIGIBLE: 'Jumlah retur melebihi sisa yang boleh diretur.',
  AMOUNT_EXCEEDS_BALANCE: 'Jumlah pembayaran melebihi sisa tagihan.',
  UNAUTHORIZED: 'Sesi Anda berakhir. Silakan login kembali.',
  FORBIDDEN: 'Anda tidak punya akses untuk melakukan aksi ini.',
  WAREHOUSE_ACCESS_NOT_CONFIGURED: 'Akses Anda belum disiapkan. Hubungi admin-bu Anda untuk di-assign ke warehouse.',
  ASSIGNMENT_EXISTS: 'User ini sudah di-assign ke warehouse tersebut.',
  // §21 frontend-integration-guide.md (2026-09-13) — diskon & kembalian.
  DISCOUNT_EXCEEDS_SUBTOTAL: 'Diskon tidak boleh melebihi subtotal.',
  AMOUNT_TENDERED_TOO_LOW: 'Uang diterima tidak boleh kurang dari jumlah pembayaran.',
  // §18 frontend-integration-guide.md (2026-09-13) — barcode scanner.
  ITEM_BARCODE_EXISTS: 'Barcode ini sudah dipakai item lain.',
  // §20 frontend-integration-guide.md (2026-09-13) — sesi kasir/shift.
  CASH_SESSION_ALREADY_OPEN: 'Masih ada sesi kasir lain yang belum ditutup.',
  INSUFFICIENT_CASH_IN_DRAWER: 'Nominal pengeluaran melebihi uang yang seharusnya ada di laci.',
  // §25 frontend-integration-guide.md (2026-09-14) — import item. Pesan default ini cuma fallback
  // — `IMPORT_VALIDATION_FAILED` biasanya ditampilkan lewat tabel `details` (per baris), bukan
  // pesan generik ini (lihat `ItemImportPage.tsx`).
  IMPORT_VALIDATION_FAILED: 'Ada baris yang gagal validasi. Perbaiki file lalu upload ulang dari awal.',
  BU_REQUIRED: 'Fitur ini butuh akun dengan BU tunggal (admin-bu/purchasing) — super-admin tidak bisa pakai ini.',
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan tak terduga.'
}
