import type { ApiErrorBody } from '../types/common'
import { translate, tk } from '../i18n/i18n'

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
  VALIDATION_ERROR: tk('Data yang dikirim tidak valid. Periksa kembali form.'),
  REVERSAL_REASON_REQUIRED: tk('Alasan reversal wajib diisi.'),
  INVALID_REVERSAL_TARGET: tk('Dokumen target reversal tidak valid atau belum selesai.'),
  SAME_WAREHOUSE: tk('Gudang asal dan tujuan tidak boleh sama.'),
  EXACTLY_ONE_ORIGIN_REQUIRED: tk('Pilih tepat satu dokumen asal untuk retur ini.'),
  INVALID_ORIGIN_FOR_TYPE: tk('Dokumen asal tidak cocok dengan tipe retur.'),
  INVALID_ORIGIN_DOCUMENT: tk('Dokumen asal tidak ditemukan atau belum selesai.'),
  DAMAGED_MUST_BE_SCRAPPED: tk('Barang dengan kondisi rusak harus diproses sebagai SCRAP.'),
  INVALID_REPLACE_ACTION: tk('Aksi ganti barang hanya berlaku untuk retur customer kondisi baik.'),
  ITEM_NOT_ON_ORIGINAL_DOCUMENT: tk('Item ini tidak ada di dokumen asal.'),
  NOT_FOUND: tk('Data tidak ditemukan.'),
  WAREHOUSE_CODE_EXISTS: tk('Kode gudang sudah dipakai.'),
  WAREHOUSE_REFERENCED: tk('Gudang masih dipakai data lain, tidak bisa dihapus.'),
  ITEM_SKU_EXISTS: tk('SKU sudah dipakai.'),
  IDEMPOTENCY_KEY_REUSED: tk('Aksi ini sudah pernah diproses dengan data berbeda. Coba ulangi dari awal.'),
  INVALID_STATUS: tk('Status dokumen saat ini tidak mendukung aksi ini.'),
  INSUFFICIENT_STOCK: tk('Stok tidak mencukupi untuk transaksi ini.'),
  FIFO_ALLOCATION_MISMATCH: tk('Terjadi kesalahan alokasi stok internal. Hubungi admin.'),
  RETURN_QUANTITY_EXCEEDS_ELIGIBLE: tk('Jumlah retur melebihi sisa yang boleh diretur.'),
  AMOUNT_EXCEEDS_BALANCE: tk('Jumlah pembayaran melebihi sisa tagihan.'),
  UNAUTHORIZED: tk('Sesi Anda berakhir. Silakan login kembali.'),
  FORBIDDEN: tk('Anda tidak punya akses untuk melakukan aksi ini.'),
  WAREHOUSE_ACCESS_NOT_CONFIGURED: tk('Akses Anda belum disiapkan. Hubungi admin-bu Anda untuk di-assign ke warehouse.'),
  ASSIGNMENT_EXISTS: tk('User ini sudah di-assign ke warehouse tersebut.'),
  // §21 frontend-integration-guide.md (2026-09-13) — diskon & kembalian.
  DISCOUNT_EXCEEDS_SUBTOTAL: tk('Diskon tidak boleh melebihi subtotal.'),
  AMOUNT_TENDERED_TOO_LOW: tk('Uang diterima tidak boleh kurang dari jumlah pembayaran.'),
  // §18 frontend-integration-guide.md (2026-09-13) — barcode scanner.
  ITEM_BARCODE_EXISTS: tk('Barcode ini sudah dipakai item lain.'),
  // Hapus item (2026-10-12).
  ITEM_HAS_STOCK: tk('Item masih punya stok. Stok harus 0 di semua gudang sebelum item bisa dihapus.'),
  ITEM_IN_OPEN_DOCUMENTS: tk('Item masih dipakai dokumen yang belum selesai.'),
  ITEM_DELETED: tk('Item ini sudah dihapus dan tidak bisa dipakai lagi.'),
  // §20 frontend-integration-guide.md (2026-09-13) — sesi kasir/shift.
  CASH_SESSION_ALREADY_OPEN: tk('Masih ada sesi kasir lain yang belum ditutup.'),
  INSUFFICIENT_CASH_IN_DRAWER: tk('Nominal pengeluaran melebihi uang yang seharusnya ada di laci.'),
  // §25 frontend-integration-guide.md (2026-09-14) — import item. Pesan default ini cuma fallback
  // — `IMPORT_VALIDATION_FAILED` biasanya ditampilkan lewat tabel `details` (per baris), bukan
  // pesan generik ini (lihat `ItemImportPage.tsx`).
  IMPORT_VALIDATION_FAILED: tk('Ada baris yang gagal validasi. Perbaiki file lalu upload ulang dari awal.'),
  BU_REQUIRED: tk('Fitur ini butuh akun dengan BU tunggal (admin-bu/purchasing) — super-admin tidak bisa pakai ini.'),
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ? translate(ERROR_MESSAGES[error.code]) : error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return translate('Terjadi kesalahan tak terduga.')
}
