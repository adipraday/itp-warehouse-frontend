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
import { listReturns } from '../../api/returns'
import { listWarehouses } from '../../api/warehouses'
import type { ReturnDocument, ReturnStatus, ReturnType } from '../../types/return'
import { usePermissions } from '../../auth/permissions'

const STATUS_OPTIONS: ReturnStatus[] = ['DRAFT', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED']

export default function ReturnListPage() {
  const { canWrite } = usePermissions()
  const canCreate = canWrite('returns')
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [type, setType] = useState<ReturnType | ''>('')
  const [status, setStatus] = useState<ReturnStatus | ''>('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['returns', warehouseId, type, status, page],
    queryFn: () =>
      listReturns({
        warehouse_id: warehouseId ?? undefined,
        type: type || undefined,
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

  const columns: DataTableColumn<ReturnDocument>[] = [
    {
      key: 'return_number',
      header: 'No. Retur',
      render: (row) => (
        <Link to={`/returns/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.return_number}
        </Link>
      ),
    },
    { key: 'type', header: 'Tipe', render: (row) => (row.type === 'RETURN_CUSTOMER' ? 'Dari Customer' : 'Ke Supplier') },
    { key: 'warehouse', header: 'Warehouse', render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'return_date', header: 'Tanggal', render: (row) => formatDate(row.return_date) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'reason', header: 'Alasan', render: (row) => row.reason ?? '-' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Returns</h1>
        {canCreate && (
          <Link
            to="/returns/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah Retur
          </Link>
        )}
      </div>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-48">
          <SelectField label="Tipe" value={type} onChange={(e) => resetPage(setType)(e.target.value as ReturnType | '')}>
            <option value="">Semua</option>
            <option value="RETURN_CUSTOMER">Dari Customer</option>
            <option value="RETURN_SUPPLIER">Ke Supplier</option>
          </SelectField>
        </div>
        <div className="w-40">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as ReturnStatus | '')}
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
              emptyMessage="Belum ada retur."
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
