import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { SelectField } from '../../components/FormField'
import { StatCard } from '../../components/StatCard'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ReportActions, ReportPrintHeader } from '../../components/ReportActions'
import { getStuckQueue } from '../../api/dashboard'
import { listWarehouses } from '../../api/warehouses'
import { listUsers } from '../../api/users'
import { formatNumber } from '../../utils/money'
import { downloadXlsx, reportFileName } from '../../utils/exportXlsx'
import { stuckQueueSheets } from './exportSheets'
import { formatTimestamp, todayISO } from '../../utils/date'
import { STUCK_GROUP_LABEL, STUCK_KIND_INFO } from './reportLabels'
import type { StuckQueueGroup, StuckQueueItem } from '../../types/dashboard'

const GROUP_HINT: Record<StuckQueueGroup, string> = {
  approval: 'transfer, opname, retur',
  completion: 'sudah disetujui',
  draft: 'belum selesai dikerjakan',
  held: 'kasir menahan transaksi',
}

const AGE_OPTIONS = [
  { value: 0, label: 'Semua yang sedang menunggu' },
  { value: 1, label: '1 hari atau lebih' },
  { value: 2, label: '2 hari atau lebih' },
  { value: 3, label: '3 hari atau lebih' },
  { value: 7, label: '7 hari atau lebih' },
  { value: 14, label: '14 hari atau lebih' },
]

const LONG_WAIT_DAYS = 7

// Antrean Macet — dokumen yang diam di status "ada yang harus bertindak", terlama dulu. Owner
// hanya memantau (tidak ada tombol aksi): klik nomor dokumen membuka detailnya.
export default function StuckQueuePage() {
  const [minAge, setMinAge] = useState(2)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-stuck-queue', minAge, warehouseId],
    queryFn: () => getStuckQueue({ min_age_days: minAge, warehouse_id: warehouseId ?? undefined }),
  })
  const queue = data?.data

  // Nama cabang dan pembuat hanya pemanis: gagal dimuat → "Warehouse #id" / "User #id",
  // tanpa menjatuhkan seluruh halaman (pola yang sama dengan Riwayat Sesi Kasir).
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'all', 'assigned'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100, scope: 'assigned' }),
    retry: false,
  })
  const warehouseName = (id: number) => warehousesData?.data.find((w) => w.id === id)?.name ?? `Warehouse #${id}`

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all-for-cash-session-history'],
    queryFn: () => listUsers({ page: 1, per_page: 100 }),
    retry: false,
  })
  const userName = (id: number | null) =>
    id == null ? '—' : (usersData?.users.find((u) => u.id === id)?.name ?? `User #${id}`)

  const columns: DataTableColumn<StuckQueueItem>[] = [
    {
      key: 'age',
      header: 'Menunggu',
      render: (row) => (
        <span className={row.age_days >= LONG_WAIT_DAYS ? 'font-medium text-red-600' : 'text-slate-700'}>
          {row.age_days === 0 ? 'Hari ini' : `${formatNumber(row.age_days)} hari`}
          {row.age_days >= LONG_WAIT_DAYS && ' (lama)'}
        </span>
      ),
    },
    {
      key: 'document',
      header: 'Dokumen',
      render: (row) => (
        <div>
          <Link to={STUCK_KIND_INFO[row.kind].path(row.document_id)} className="font-medium text-blue-600 hover:underline">
            {row.document_number}
          </Link>
          <p className="text-xs text-slate-400">{STUCK_KIND_INFO[row.kind].label}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => STUCK_KIND_INFO[row.kind].status },
    {
      key: 'warehouse',
      header: 'Cabang',
      render: (row) =>
        row.to_warehouse_id == null
          ? warehouseName(row.warehouse_id)
          : `${warehouseName(row.warehouse_id)} → ${warehouseName(row.to_warehouse_id)}`,
    },
    { key: 'waitingOn', header: 'Menunggu tindakan', render: (row) => STUCK_KIND_INFO[row.kind].waitingOn },
    { key: 'since', header: 'Sejak', render: (row) => formatTimestamp(row.waiting_since) },
    { key: 'creator', header: 'Dibuat oleh', render: (row) => userName(row.created_by) },
  ]

  async function exportExcel() {
    const full = await getStuckQueue({ min_age_days: minAge, warehouse_id: warehouseId ?? undefined, limit: 1000 })
    await downloadXlsx(
      reportFileName('antrean-macet', todayISO()),
      stuckQueueSheets(full.data, { warehouseName, userName }),
    )
  }

  return (
    <div>
      <ReportPrintHeader title="Antrean Macet" subtitle={`Menunggu ${minAge === 0 ? 'sekarang' : `${minAge} hari atau lebih`}`} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">Antrean Macet</h1>
          <p className="text-sm text-slate-500">
            Dokumen yang menunggu tindakan seseorang, terlama dulu. Anda memantau; penyelesaiannya oleh yang berwenang.
          </p>
        </div>
        <ReportActions onExcel={exportExcel} disabled={!queue} />
      </div>

      <FilterBar>
        <div className="w-64">
          <SelectField label="Sudah menunggu" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))}>
            {AGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-56">
          <WarehouseSelect label="Cabang" placeholder="Semua cabang" value={warehouseId} onChange={setWarehouseId} />
        </div>
      </FilterBar>

      {isError ? (
        <div className="mt-4">
          <ErrorState error={error} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(Object.keys(STUCK_GROUP_LABEL) as StuckQueueGroup[]).map((group) => {
              const total = queue?.summary.by_group[group]
              return (
                <StatCard
                  key={group}
                  label={STUCK_GROUP_LABEL[group]}
                  value={total == null ? '...' : formatNumber(total)}
                  hint={GROUP_HINT[group]}
                  tone={total != null && total > 0 ? 'warn' : 'default'}
                />
              )
            })}
          </div>

          {queue?.summary.truncated && (
            <p className="mt-3 text-xs text-slate-500">
              Menampilkan {formatNumber(queue.items.length)} dokumen terlama dari {formatNumber(queue.summary.total)}.
              Persempit dengan cabang atau umur minimal untuk melihat sisanya.
            </p>
          )}

          <div className="mt-4">
            <DataTable
              columns={columns}
              data={queue?.items ?? []}
              getRowKey={(row) => `${row.kind}-${row.document_id}`}
              loading={isLoading}
              emptyMessage={
                minAge === 0
                  ? 'Tidak ada dokumen yang sedang menunggu. Semua lancar.'
                  : `Tidak ada dokumen yang menunggu ${minAge} hari atau lebih. Semua lancar.`
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
