import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { TextField, TextareaField } from '../../components/FormField'
import { StatusBadge } from '../../components/StatusBadge'
import { StatCard } from '../../components/StatCard'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { formatRupiah, parseMoney } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { getCurrentCashSession, openCashSession } from '../../api/cashSessions'
import { getWarehouse } from '../../api/warehouses'
import { paymentMethodLabel } from '../../types/payment'
import { CashSessionExpenseModal } from './CashSessionExpenseModal'
import { CashSessionCloseModal } from './CashSessionCloseModal'
import type { CashSession, CashSessionExpense, CashSessionMethodBreakdown } from '../../types/cashSession'

/**
 * Sesi kasir/shift (§20 frontend-integration-guide.md, 2026-09-13) — halaman self-scoped: cuma
 * urus sesi milik user yang lagi login (`GET /cash-sessions/current`), bukan halaman browse
 * semua sesi kasir lintas user (itu kebutuhan audit terpisah, di luar scope permintaan sesi ini).
 * Tidak ada gating permission — backend sendiri tidak mendokumentasikan pembatasan role buat buka
 * sesi (beda dari resource lain yang punya `WRITE_MATRIX` eksplisit di §5), jadi halaman ini
 * kebuka buat siapa pun yang login, sama seperti halaman Profile.
 */
export default function CashSessionPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  // Laporan penutupan terakhir (Z-report) — ditampilkan abis sesi ditutup, sebelum kasir buka
  // sesi baru, biar angkanya sempat kelihatan (response `close` tidak persisten di UI kalau tidak
  // ditangkap manual di sini — begitu `current` di-refetch hasilnya balik `null`).
  const [lastClosed, setLastClosed] = useState<CashSession | null>(null)

  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [openingAmount, setOpeningAmount] = useState('0')
  const [openNotes, setOpenNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cash-sessions', 'current'],
    queryFn: getCurrentCashSession,
  })
  const session = data?.data ?? null

  const { data: warehouse } = useQuery({
    queryKey: ['warehouses', session?.warehouse_id],
    queryFn: () => getWarehouse(session?.warehouse_id as number),
    enabled: !!session,
  })

  const openMutation = useMutation({
    mutationFn: () =>
      openCashSession({
        warehouse_id: warehouseId as number,
        opening_amount: Number(openingAmount) || 0,
        notes: openNotes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions', 'current'] })
      toast.show('Kasir dibuka.', 'success')
      setLastClosed(null)
      setWarehouseId(null)
      setOpeningAmount('0')
      setOpenNotes('')
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleOpenSubmit(e: FormEvent) {
    e.preventDefault()
    if (!warehouseId) {
      toast.show('Warehouse wajib dipilih.', 'error')
      return
    }
    openMutation.mutate()
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Memuat...</p>
  }

  // --- Belum ada sesi terbuka: form Buka Kasir (+ laporan penutupan terakhir kalau ada) ---
  if (!session) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Sesi Kasir</h1>
        <p className="mt-1 text-sm text-slate-500">
          Belum ada sesi kasir yang terbuka. Buka kasir dulu sebelum mulai catat transaksi.
        </p>

        {lastClosed && (
          <div className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700">Laporan Penutupan Terakhir</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Modal Awal</dt>
                <dd>{formatRupiah(lastClosed.opening_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Uang Seharusnya</dt>
                <dd>{formatRupiah(lastClosed.expected_cash_amount ?? '0')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Hasil Hitung Fisik</dt>
                <dd>{formatRupiah(lastClosed.closing_amount ?? '0')}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
                <dt>Selisih</dt>
                <dd
                  className={
                    parseMoney(lastClosed.cash_difference ?? '0') < 0
                      ? 'text-red-600'
                      : parseMoney(lastClosed.cash_difference ?? '0') > 0
                        ? 'text-emerald-600'
                        : ''
                  }
                >
                  {formatRupiah(lastClosed.cash_difference ?? '0')}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <form
          onSubmit={handleOpenSubmit}
          className="mt-6 max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <WarehouseSelect
            label="Warehouse"
            required
            placeholder="-- pilih warehouse --"
            value={warehouseId}
            onChange={setWarehouseId}
          />
          <TextField
            label="Modal Awal"
            type="number"
            min={0}
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
          />
          <TextareaField label="Catatan (opsional)" value={openNotes} onChange={(e) => setOpenNotes(e.target.value)} />
          <button
            type="submit"
            disabled={openMutation.isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {openMutation.isPending ? 'Membuka...' : 'Buka Kasir'}
          </button>
        </form>
      </div>
    )
  }

  // --- Sesi lagi terbuka: live summary + aksi Kas Keluar & Tutup Kasir ---
  const summary = session.summary
  const liveExpectedCash = parseMoney(summary?.live_expected_cash ?? session.opening_amount)

  const methodColumns: DataTableColumn<CashSessionMethodBreakdown>[] = [
    { key: 'method', header: 'Metode', render: (row) => paymentMethodLabel(row.method) },
    { key: 'count', header: 'Jumlah Transaksi', className: 'text-right', render: (row) => row.count },
    { key: 'amount', header: 'Total', className: 'text-right', render: (row) => formatRupiah(row.amount) },
  ]

  const expenseColumns: DataTableColumn<CashSessionExpense>[] = [
    { key: 'created_at', header: 'Waktu', render: (row) => formatTimestamp(row.created_at) },
    { key: 'description', header: 'Alasan', render: (row) => row.description },
    { key: 'amount', header: 'Jumlah', className: 'text-right', render: (row) => formatRupiah(row.amount) },
  ]

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-900">
            Sesi Kasir
            <StatusBadge status={session.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {warehouse?.data.code} — {warehouse?.data.name} &middot; Dibuka {formatTimestamp(session.opened_at)}
          </p>
          {session.notes && <p className="mt-1 text-sm text-slate-500">Catatan: {session.notes}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Kas Keluar
          </button>
          <button
            type="button"
            onClick={() => setCloseModalOpen(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Tutup Kasir
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Modal Awal" value={formatRupiah(session.opening_amount)} />
        <StatCard label="Uang Seharusnya Sekarang" value={formatRupiah(liveExpectedCash)} tone="good" />
        <StatCard label="Total Pengeluaran" value={formatRupiah(summary?.total_expenses ?? '0')} tone="warn" />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-700">Rincian per Metode Bayar</h2>
      <DataTable
        columns={methodColumns}
        data={summary?.by_method ?? []}
        getRowKey={(row) => row.method}
        emptyMessage="Belum ada transaksi di sesi ini."
      />

      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-700">Kas Keluar</h2>
      <DataTable
        columns={expenseColumns}
        data={summary?.expenses ?? []}
        getRowKey={(row) => row.id}
        emptyMessage="Belum ada pengeluaran dicatat."
      />

      <CashSessionExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        sessionId={session.id}
      />
      <CashSessionCloseModal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        sessionId={session.id}
        liveExpectedCash={liveExpectedCash}
        onClosed={setLastClosed}
      />
    </div>
  )
}
