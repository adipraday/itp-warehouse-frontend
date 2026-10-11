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
import { getStuckQueue } from '../../api/dashboard'
import { listWarehouses } from '../../api/warehouses'
import { listUsers } from '../../api/users'
import { formatNumber } from '../../utils/money'
import { formatUtcAsWib } from '../../utils/date'
import type { StuckQueueGroup, StuckQueueItem, StuckQueueKind } from '../../types/dashboard'

interface KindInfo {
  label: string
  status: string
  // Siapa yang harus bertindak — inti halaman ini: owner melihat di mana prosesnya tersumbat.
  waitingOn: string
  path: (id: number) => string
}

const KIND_INFO: Record<StuckQueueKind, KindInfo> = {
  transfer_pending_approval: {
    label: 'Transfer',
    status: 'Belum disetujui',
    waitingOn: 'Admin bisnis atau kepala cabang tujuan menyetujui',
    path: (id) => `/stock-transfers/${id}`,
  },
  transfer_pending_completion: {
    label: 'Transfer',
    status: 'Disetujui, belum diselesaikan',
    waitingOn: 'Gudang pengirim menekan Complete',
    path: (id) => `/stock-transfers/${id}`,
  },
  opname_pending_submission: {
    label: 'Stok opname',
    status: 'Draft, belum diajukan',
    waitingOn: 'Staf gudang mengajukan hasil hitung',
    path: (id) => `/stock-opnames/${id}`,
  },
  opname_pending_approval: {
    label: 'Stok opname',
    status: 'Diajukan, belum disetujui',
    waitingOn: 'Admin bisnis menyetujui',
    path: (id) => `/stock-opnames/${id}`,
  },
  return_pending_approval: {
    label: 'Retur',
    status: 'Belum disetujui',
    waitingOn: 'Admin bisnis menyetujui',
    path: (id) => `/returns/${id}`,
  },
  return_pending_completion: {
    label: 'Retur',
    status: 'Disetujui, belum diselesaikan',
    waitingOn: 'Staf menyelesaikan retur',
    path: (id) => `/returns/${id}`,
  },
  sale_held: {
    label: 'Penjualan',
    status: 'Ditahan',
    waitingOn: 'Kasir melanjutkan atau membatalkan',
    path: (id) => `/sales/${id}`,
  },
  sale_draft: {
    label: 'Penjualan',
    status: 'Draft belum selesai',
    waitingOn: 'Kasir menyelesaikan atau menghapus',
    path: (id) => `/sales/${id}`,
  },
  purchase_draft: {
    label: 'Pembelian',
    status: 'Draft belum selesai',
    waitingOn: 'Purchasing menyelesaikan atau menghapus',
    path: (id) => `/purchases/${id}`,
  },
  inbound_draft: {
    label: 'Barang masuk',
    status: 'Draft belum selesai',
    waitingOn: 'Staf gudang menyelesaikan atau menghapus',
    path: (id) => `/inbounds/${id}`,
  },
  outbound_draft: {
    label: 'Barang keluar',
    status: 'Draft belum selesai',
    waitingOn: 'Staf gudang menyelesaikan atau menghapus',
    path: (id) => `/outbounds/${id}`,
  },
}

const GROUP_LABEL: Record<StuckQueueGroup, string> = {
  approval: 'Menunggu persetujuan',
  completion: 'Menunggu diselesaikan',
  draft: 'Draft menggantung',
  held: 'Transaksi tertahan',
}

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
          <Link to={KIND_INFO[row.kind].path(row.document_id)} className="font-medium text-blue-600 hover:underline">
            {row.document_number}
          </Link>
          <p className="text-xs text-slate-400">{KIND_INFO[row.kind].label}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => KIND_INFO[row.kind].status },
    {
      key: 'warehouse',
      header: 'Cabang',
      render: (row) =>
        row.to_warehouse_id == null
          ? warehouseName(row.warehouse_id)
          : `${warehouseName(row.warehouse_id)} → ${warehouseName(row.to_warehouse_id)}`,
    },
    { key: 'waitingOn', header: 'Menunggu tindakan', render: (row) => KIND_INFO[row.kind].waitingOn },
    { key: 'since', header: 'Sejak', render: (row) => formatUtcAsWib(row.waiting_since) },
    { key: 'creator', header: 'Dibuat oleh', render: (row) => userName(row.created_by) },
  ]

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Antrean Macet</h1>
      <p className="mb-6 text-sm text-slate-500">
        Dokumen yang menunggu tindakan seseorang, terlama dulu. Anda memantau; penyelesaiannya oleh yang berwenang.
      </p>

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
            {(Object.keys(GROUP_LABEL) as StuckQueueGroup[]).map((group) => {
              const total = queue?.summary.by_group[group]
              return (
                <StatCard
                  key={group}
                  label={GROUP_LABEL[group]}
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
