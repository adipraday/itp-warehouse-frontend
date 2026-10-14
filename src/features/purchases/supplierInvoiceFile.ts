export const MAX_SUPPLIER_INVOICE_BYTES = 10 * 1024 * 1024

// Validasi sisi klien hanya untuk umpan balik cepat — backend tetap memeriksa tipe (termasuk byte
// awal "%PDF-") dan ukurannya.
export function validateSupplierInvoiceFile(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) return 'Hanya file PDF yang bisa diunggah.'
  if (file.size > MAX_SUPPLIER_INVOICE_BYTES) return 'Ukuran PDF maksimal 10 MB.'
  if (file.size === 0) return 'File kosong.'
  return null
}
