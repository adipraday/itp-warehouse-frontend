import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useToast } from '../hooks/useToast'
import { COMPANY_NAME } from '../config/company'
import { formatTimestamp } from '../utils/date'
import { useI18n } from '../i18n/useI18n'

interface ReportActionsProps {
  /** Membuat dan mengunduh file Excel. Boleh melempar error; pesannya ditampilkan sebagai toast. */
  onExcel: () => Promise<void>
  disabled?: boolean
}

// Tombol ekspor di pojok judul halaman laporan: "Unduh Excel" (.xlsx dibuat di browser) dan
// "Cetak / Simpan PDF" (dialog cetak browser; menu, filter, dan tombol disembunyikan lewat
// kelas `print:hidden`, jadi hasil PDF-nya hanya judul + isi laporan).
export function ReportActions({ onExcel, disabled = false }: ReportActionsProps) {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function handleExcel() {
    setBusy(true)
    try {
      await onExcel()
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('Gagal membuat file Excel.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-2 print:hidden">
      <button
        type="button"
        onClick={handleExcel}
        disabled={disabled || busy}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? t('Menyiapkan...') : t('Unduh Excel')}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        disabled={disabled}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('Cetak / Simpan PDF')}
      </button>
    </div>
  )
}

// Kepala laporan yang HANYA muncul saat dicetak: nama perusahaan, judul, rentang, dan siapa yang
// mencetak kapan (supaya PDF yang beredar punya asal-usul yang jelas).
export function ReportPrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useI18n()
  const { user } = useAuth()
  // formatTimestamp mengharapkan string UTC dari database, jadi jam sekarang diberikan dalam UTC.
  const printedAt = formatTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 23))
  return (
    <div className="mb-4 hidden border-b border-slate-300 pb-3 print:block">
      <p className="text-xs uppercase tracking-wide text-slate-500">{COMPANY_NAME}</p>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      <p className="mt-1 text-xs text-slate-400">
        {t('Dicetak')} {printedAt} {t('WIB')}{user?.name ? t(' oleh {name}', { name: user.name }) : ''}
      </p>
    </div>
  )
}
