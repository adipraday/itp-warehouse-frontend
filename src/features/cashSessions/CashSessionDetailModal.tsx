import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { StatusBadge } from '../../components/StatusBadge'
import { StatCard } from '../../components/StatCard'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { formatRupiah, parseMoney } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { getCashSession } from '../../api/cashSessions'
import { paymentMethodLabel } from '../../types/payment'
import type { CashSessionExpense, CashSessionMethodBreakdown } from '../../types/cashSession'

interface CashSessionDetailModalProps {
  sessionId: number | null
  onClose: () => void
}

// Detail 1 sesi (dari Riwayat Sesi Kasir) — mirip tampilan "sesi lagi terbuka" di CashSessionPage,
// tapi ini bisa OPEN (punya user lain, lagi jalan) atau CLOSED (sudah ada Z-report lengkap).
export function CashSessionDetailModal({ sessionId, onClose }: CashSessionDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['cash-sessions', sessionId],
    queryFn: () => getCashSession(sessionId as number),
    enabled: sessionId != null,
  })
  const session = data?.data

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
    <Modal open={sessionId != null} onClose={onClose} title="Detail Sesi Kasir">
      {isLoading && <p className="text-sm text-slate-400">Memuat...</p>}
      {session && (
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-3">
            <StatusBadge status={session.status} />
            <span className="text-sm text-slate-500">
              User #{session.user_id} &middot; Warehouse #{session.warehouse_id}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Dibuka {formatTimestamp(session.opened_at)}
            {session.closed_at && <> &middot; Ditutup {formatTimestamp(session.closed_at)}</>}
          </p>
          {session.notes && <p className="mt-1 text-sm text-slate-500">Catatan: {session.notes}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Modal Awal" value={formatRupiah(session.opening_amount)} />
            <StatCard label="Total Pengeluaran" value={formatRupiah(session.summary?.total_expenses ?? '0')} tone="warn" />
            {session.status === 'CLOSED' ? (
              <>
                <StatCard label="Uang Seharusnya" value={formatRupiah(session.expected_cash_amount ?? '0')} />
                <StatCard
                  label="Selisih"
                  value={formatRupiah(session.cash_difference ?? '0')}
                  tone={parseMoney(session.cash_difference ?? '0') < 0 ? 'warn' : 'good'}
                />
              </>
            ) : (
              <StatCard
                label="Uang Seharusnya Sekarang"
                value={formatRupiah(session.summary?.live_expected_cash ?? session.opening_amount)}
                tone="good"
              />
            )}
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Rincian per Metode Bayar</h3>
          <DataTable
            columns={methodColumns}
            data={session.summary?.by_method ?? []}
            getRowKey={(row) => row.method}
            emptyMessage="Tidak ada transaksi di sesi ini."
          />

          <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Kas Keluar</h3>
          <DataTable
            columns={expenseColumns}
            data={session.summary?.expenses ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="Tidak ada pengeluaran dicatat."
          />
        </div>
      )}
    </Modal>
  )
}
