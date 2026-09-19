import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { SelectField, TextField } from '../../components/FormField'
import { StatusBadge } from '../../components/StatusBadge'
import { formatRupiah, parseMoney } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { listCashSessions } from '../../api/cashSessions'
import { CashSessionDetailModal } from './CashSessionDetailModal'
import type { CashSession, CashSessionStatus } from '../../types/cashSession'

// Riwayat Sesi Kasir — browse lintas user (§20 frontend-integration-guide.md), beda dari
// /cash-session yang self-scoped ke sesi milik user login sendiri. Endpoint list ini sudah ada
// dari Fase 22 tapi belum pernah dipakai UI-nya sampai sekarang (lihat progress-log.md).
export default function CashSessionHistoryPage() {
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState<CashSessionStatus | ''>('')
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cash-sessions', 'history', warehouseId, userId, status, page],
    queryFn: () =>
      listCashSessions({
        warehouse_id: warehouseId ?? undefined,
        user_id: userId ? Number(userId) : undefined,
        status: status || undefined,
        page,
      }),
  })

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const columns: DataTableColumn<CashSession>[] = [
    { key: 'id', header: 'ID', render: (row) => `#${row.id}` },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'warehouse_id', header: 'Warehouse', render: (row) => `#${row.warehouse_id}` },
    { key: 'user_id', header: 'Kasir', render: (row) => `User #${row.user_id}` },
    { key: 'opened_at', header: 'Dibuka', render: (row) => formatTimestamp(row.opened_at) },
    { key: 'closed_at', header: 'Ditutup', render: (row) => (row.closed_at ? formatTimestamp(row.closed_at) : '—') },
    { key: 'opening_amount', header: 'Modal Awal', className: 'text-right', render: (row) => formatRupiah(row.opening_amount) },
    {
      key: 'cash_difference',
      header: 'Selisih',
      className: 'text-right',
      render: (row) =>
        row.cash_difference == null ? (
          '—'
        ) : (
          <span className={parseMoney(row.cash_difference) < 0 ? 'font-medium text-red-600' : 'text-emerald-600'}>
            {formatRupiah(row.cash_difference)}
          </span>
        ),
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Riwayat Sesi Kasir</h1>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-32">
          <TextField label="User ID" type="number" min={1} value={userId} onChange={(e) => resetPage(setUserId)(e.target.value)} />
        </div>
        <div className="w-36">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as CashSessionStatus | '')}
          >
            <option value="">Semua</option>
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
          </SelectField>
        </div>
      </FilterBar>

      <div className="mt-4">
        {isError ? (
          <ErrorState error={error} />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              getRowKey={(row) => row.id}
              loading={isLoading}
              emptyMessage="Tidak ada sesi kasir."
              onRowClick={(row) => setDetailId(row.id)}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <CashSessionDetailModal sessionId={detailId} onClose={() => setDetailId(null)} />
    </div>
  )
}
