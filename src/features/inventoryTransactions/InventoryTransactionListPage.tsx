import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { SelectField, TextField } from '../../components/FormField'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate } from '../../utils/date'
import { listInventoryTransactions } from '../../api/inventoryTransactions'
import type { InventoryTransactionKind } from '../../api/inventoryTransactions'
import { listWarehouses } from '../../api/warehouses'
import type { InventoryTransaction, InventoryTransactionStatus } from '../../types/inventoryTransaction'
import { usePermissions } from '../../auth/permissions'

const STATUS_OPTIONS: InventoryTransactionStatus[] = ['DRAFT', 'COMPLETED', 'CANCELLED']

interface InventoryTransactionListPageProps {
  kind: InventoryTransactionKind
  title: string
}

export default function InventoryTransactionListPage({ kind, title }: InventoryTransactionListPageProps) {
  const { canWrite } = usePermissions()
  const canCreate = canWrite(kind === 'inbound' ? 'inbounds' : 'outbounds')
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [status, setStatus] = useState<InventoryTransactionStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [kind === 'inbound' ? 'inbounds' : 'outbounds', warehouseId, status, from, to, page],
    queryFn: () =>
      listInventoryTransactions(kind, {
        warehouse_id: warehouseId ?? undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
      }),
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100 }),
  })
  const warehouseLabel = (id: number) => {
    const w = warehouses?.data.find((wh) => wh.id === id)
    return w ? `${w.code} — ${w.name}` : `#${id}`
  }

  const basePath = kind === 'inbound' ? '/inbounds' : '/outbounds'

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const columns: DataTableColumn<InventoryTransaction>[] = [
    {
      key: 'transaction_number',
      header: 'No. Transaksi',
      render: (row) => (
        <Link to={`${basePath}/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.transaction_number}
        </Link>
      ),
    },
    { key: 'warehouse', header: 'Warehouse', render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'transaction_date', header: 'Tanggal', render: (row) => formatDate(row.transaction_date) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'notes', header: 'Catatan', render: (row) => row.notes ?? '-' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {canCreate && (
          <Link
            to={`${basePath}/new`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah {title}
          </Link>
        )}
      </div>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-40">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as InventoryTransactionStatus | '')}
          >
            <option value="">Semua</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-40">
          <TextField label="Dari Tanggal" type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label="Sampai Tanggal" type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
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
              emptyMessage={`Belum ada ${title.toLowerCase()}.`}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
