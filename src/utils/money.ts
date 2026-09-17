/**
 * API selalu mengembalikan field uang/desimal sebagai string (mis. "150000.00")
 * supaya presisi tidak rusak jadi floating point. Parse di sini, jangan +/- string mentah.
 */
export function parseMoney(value: string | number): number {
  return typeof value === 'number' ? value : parseFloat(value)
}

export function formatRupiah(value: string | number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parseMoney(value))
}

export function formatNumber(value: string | number): string {
  return new Intl.NumberFormat('id-ID').format(parseMoney(value))
}
