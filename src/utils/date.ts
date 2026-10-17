const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

import { getLanguage } from '../i18n/i18n'

const MONTHS = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

// Nama bulan mengikuti bahasa yang aktif saat tanggal diformat.
const monthNames = () => MONTHS[getLanguage()]

/**
 * Format tanggal murni (`YYYY-MM-DD`, kolom DATE tanpa waktu/timezone).
 * Diparsing manual (bukan `new Date()`) supaya tidak kena geser timezone browser.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  const monthName = monthNames()[Number(month) - 1] ?? month
  return `${Number(day)} ${monthName} ${year}`
}

/**
 * Format timestamp warehouse-backend (`YYYY-MM-DD HH:mm:ss.SSS`, kolom DATETIME) ke **WIB** (UTC+7).
 * Nilainya disimpan dalam UTC (server dan MariaDB berjalan di UTC) tapi string-nya tidak membawa
 * zona waktu, jadi di sini diperlakukan sebagai UTC lalu digeser +7 jam. Dulu ditampilkan apa
 * adanya, sehingga semua jam di aplikasi tampak 7 jam lebih awal dari jam dinding (diperbaiki
 * 2026-10-12). String tanpa bagian jam (`YYYY-MM-DD`) tidak dikonversi.
 */
export function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return '-'
  const [datePart, timePart] = ts.split(' ')
  if (!timePart) return formatDate(datePart)
  const parsed = new Date(`${datePart}T${timePart.slice(0, 8)}Z`)
  if (Number.isNaN(parsed.getTime())) return formatDate(datePart)
  const wib = new Date(parsed.getTime() + WIB_OFFSET_MS)
  const hours = String(wib.getUTCHours()).padStart(2, '0')
  const minutes = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${wib.getUTCDate()} ${monthNames()[wib.getUTCMonth()]} ${wib.getUTCFullYear()} ${hours}:${minutes}`
}

/**
 * Format timestamp ISO 8601 (`...Z`, dari auth-backend — beda dari `formatTimestamp` di atas
 * yang khusus format naive `YYYY-MM-DD HH:mm:ss.SSS` warehouse-backend). Ini PUNYA info timezone
 * (UTC eksplisit lewat `Z`), jadi aman dikonversi ke waktu lokal browser lewat `Date`.
 */
export function formatIsoTimestamp(ts: string | null | undefined): string {
  if (!ts) return '-'
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return '-'
  const day = date.getDate()
  const monthName = monthNames()[date.getMonth()]
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${monthName} ${year} ${hours}:${minutes}`
}

/** Label pendek buat sumbu chart (mis. "21 Sep") — tanpa tahun, dari YYYY-MM-DD. */
export function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  const monthName = monthNames()[Number(month) - 1] ?? month
  return `${Number(day)} ${monthName}`
}

export function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function firstDayOfMonthISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}-01`
}

/** Tanggal `days` hari sebelum hari ini (lokal), format YYYY-MM-DD. `daysAgoISO(0)` = hari ini. */
export function daysAgoISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
