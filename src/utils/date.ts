const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/**
 * Format tanggal murni (`YYYY-MM-DD`, kolom DATE tanpa waktu/timezone).
 * Diparsing manual (bukan `new Date()`) supaya tidak kena geser timezone browser.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  const monthName = MONTHS_ID[Number(month) - 1] ?? month
  return `${Number(day)} ${monthName} ${year}`
}

/**
 * Format timestamp (`YYYY-MM-DD HH:mm:ss.SSS`) apa adanya dari database.
 * String ini tidak punya info timezone — treat sebagai waktu lokal, jangan konversi UTC.
 */
export function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return '-'
  const [datePart, timePart] = ts.split(' ')
  const dateLabel = formatDate(datePart)
  const timeLabel = timePart ? timePart.slice(0, 5) : ''
  return timeLabel ? `${dateLabel} ${timeLabel}` : dateLabel
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
  const monthName = MONTHS_ID[date.getMonth()]
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${monthName} ${year} ${hours}:${minutes}`
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
