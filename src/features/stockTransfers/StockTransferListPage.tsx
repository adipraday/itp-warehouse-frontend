import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { SelectField } from '../../components/FormField'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate } from '../../utils/date'
import { listStockTransfers } from '../../api/stockTransfers'
import { listWarehouses } from '../../api/warehouses'
import type { StockTransfer, StockTransferStatus } from '../../types/stockTransfer'
import { usePermissions } from '../../auth/permissions'

const STATUS_OPTIONS: StockTransferStatus[] = ['DRAFT', 'APPROVED', 'COMPLETED', 'CANCELLED']

export default function StockTransferListPage() {
  const { canWrite } = usePermissions()
  const canCreate = canWrite('stock-transfers')
  const [page, setPage] = useState(1)
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [status, setStatus] = useState<StockTransferStatus | ''>('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stock-transfers', sourceId, destinationId, status, page],
    queryFn: () =>
      listStockTransfers({
        source_warehouse_id: sourceId ?? undefined,
        destination_warehouse_id: destinationId ?? undefined,
        status: status || undefined,
        page,
      }),
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100 }),
  })
  const warehouseLabel = (id: number) => {
    const w = warehouses?.data.find((wh) => wh.id === id)
    return w ? w.code : `#${id}`
  }

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const columns: DataTableColumn<StockTransfer>[] = [
    {
      key: 'transfer_number',
      header: 'No. Transfer',
      render: (row) => (
        <Link to={`/stock-transfers/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.transfer_number}
        </Link>
      ),
    },
    {
      key: 'route',
      header: 'Rute',
      render: (row) => (
        <span>
          {warehouseLabel(row.source_warehouse_id)} &rarr; {warehouseLabel(row.destination_warehouse_id)}
        </span>
      ),
    },
    { key: 'transfer_date', header: 'Tanggal', render: (row) => formatDate(row.transfer_date) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'notes', header: 'Catatan', render: (row) => row.notes ?? '-' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Stock Transfers</h1>
        {canCreate && (
          <Link
            to="/stock-transfers/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah Transfer
          </Link>
        )}
      </div>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect label="Dari Warehouse" value={sourceId} onChange={resetPage(setSourceId)} />
        </div>
        <div className="w-56">
          <WarehouseSelect label="Ke Warehouse" value={destinationId} onChange={resetPage(setDestinationId)} />
        </div>
        <div className="w-40">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as StockTransferStatus | '')}
          >
            <option value="">Semua</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
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
              emptyMessage="Belum ada stock transfer."
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
