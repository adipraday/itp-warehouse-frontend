/**
 * API selalu mengembalikan field uang/desimal sebagai string (mis. "150000.00")
 * supaya presisi tidak rusak jadi floating point. Parse di sini, jangan +/- string mentah.
 */
import { currentLocale, getLanguage } from '../i18n/i18n'

export function parseMoney(value: string | number): number {
  return typeof value === 'number' ? value : parseFloat(value)
}

// Mata uang tetap Rupiah di kedua bahasa; yang berganti hanya pemisah ribuan (1.000.000 vs 1,000,000).
export function formatRupiah(value: string | number): string {
  const amount = parseMoney(value)
  const digits = new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 0 }).format(Math.abs(amount))
  return `${amount < 0 ? '-' : ''}Rp${getLanguage() === 'en' ? '' : ' '}${digits}`
}

export function formatNumber(value: string | number): string {
  return new Intl.NumberFormat(currentLocale()).format(parseMoney(value))
}
