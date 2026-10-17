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
import { useI18n } from '../../i18n/useI18n'

interface CashSessionDetailModalProps {
  sessionId: number | null
  onClose: () => void
  // Resolusi nama kasir dari parent (CashSessionHistoryPage) — sengaja tidak query ulang di sini,
  // parent sudah punya map-nya dari 1x fetch `GET /users`.
  kasirLabel: (userId: number) => string
}

// Detail 1 sesi (dari Riwayat Sesi Kasir) — mirip tampilan "sesi lagi terbuka" di CashSessionPage,
// tapi ini bisa OPEN (punya user lain, lagi jalan) atau CLOSED (sudah ada Z-report lengkap).
export function CashSessionDetailModal({ sessionId, onClose, kasirLabel }: CashSessionDetailModalProps) {
  const { t } = useI18n()
  const { data, isLoading } = useQuery({
    queryKey: ['cash-sessions', sessionId],
    queryFn: () => getCashSession(sessionId as number),
    enabled: sessionId != null,
  })
  const session = data?.data

  const methodColumns: DataTableColumn<CashSessionMethodBreakdown>[] = [
    { key: 'method', header: t('Metode'), render: (row) => paymentMethodLabel(row.method) },
    { key: 'count', header: t('Jumlah Transaksi'), className: 'text-right', render: (row) => row.count },
    { key: 'amount', header: t('Total'), className: 'text-right', render: (row) => formatRupiah(row.amount) },
  ]

  const expenseColumns: DataTableColumn<CashSessionExpense>[] = [
    { key: 'created_at', header: t('Waktu'), render: (row) => formatTimestamp(row.created_at) },
    { key: 'description', header: t('Alasan'), render: (row) => row.description },
    { key: 'amount', header: t('Jumlah'), className: 'text-right', render: (row) => formatRupiah(row.amount) },
  ]

  return (
    <Modal open={sessionId != null} onClose={onClose} title={t('Detail Sesi Kasir')}>
      {isLoading && <p className="text-sm text-slate-400">{t('Memuat...')}</p>}
      {session && (
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-3">
            <StatusBadge status={session.status} />
            <span className="text-sm text-slate-500">
              {kasirLabel(session.user_id)} {t('· Warehouse #')}{session.warehouse_id}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {t('Dibuka')} {formatTimestamp(session.opened_at)}
            {session.closed_at && <> {t('· Ditutup')} {formatTimestamp(session.closed_at)}</>}
          </p>
          {session.notes && <p className="mt-1 text-sm text-slate-500">{t('Catatan:')} {session.notes}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label={t('Modal Awal')} value={formatRupiah(session.opening_amount)} />
            <StatCard label={t('Total Pengeluaran')} value={formatRupiah(session.summary?.total_expenses ?? '0')} tone="warn" />
            {session.status === 'CLOSED' ? (
              <>
                <StatCard label={t('Uang Seharusnya')} value={formatRupiah(session.expected_cash_amount ?? '0')} />
                <StatCard
                  label={t('Selisih')}
                  value={formatRupiah(session.cash_difference ?? '0')}
                  tone={parseMoney(session.cash_difference ?? '0') < 0 ? 'warn' : 'good'}
                />
              </>
            ) : (
              <StatCard
                label={t('Uang Seharusnya Sekarang')}
                value={formatRupiah(session.summary?.live_expected_cash ?? session.opening_amount)}
                tone="good"
              />
            )}
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-700">{t('Rincian per Metode Bayar')}</h3>
          <DataTable
            columns={methodColumns}
            data={session.summary?.by_method ?? []}
            getRowKey={(row) => row.method}
            emptyMessage={t('Tidak ada transaksi di sesi ini.')}
          />

          <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-700">{t('Kas Keluar')}</h3>
          <DataTable
            columns={expenseColumns}
            data={session.summary?.expenses ?? []}
            getRowKey={(row) => row.id}
            emptyMessage={t('Tidak ada pengeluaran dicatat.')}
          />
        </div>
      )}
    </Modal>
  )
}
