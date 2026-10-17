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
import { listStockOpnames } from '../../api/stockOpnames'
import { listWarehouses } from '../../api/warehouses'
import type { StockOpname, StockOpnameStatus } from '../../types/stockOpname'
import { usePermissions } from '../../auth/permissions'
import { useI18n } from '../../i18n/useI18n'

const STATUS_OPTIONS: StockOpnameStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED']

export default function StockOpnameListPage() {
  const { t } = useI18n()
  const { canWrite } = usePermissions()
  const canCreate = canWrite('stock-opnames')
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [status, setStatus] = useState<StockOpnameStatus | ''>('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stock-opnames', warehouseId, status, page],
    queryFn: () =>
      listStockOpnames({ warehouse_id: warehouseId ?? undefined, status: status || undefined, page }),
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100 }),
  })
  const warehouseLabel = (id: number) => {
    const w = warehouses?.data.find((wh) => wh.id === id)
    return w ? `${w.code} — ${w.name}` : `#${id}`
  }

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const columns: DataTableColumn<StockOpname>[] = [
    {
      key: 'opname_number',
      header: t('No. Opname'),
      render: (row) => (
        <Link to={`/stock-opnames/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.opname_number}
        </Link>
      ),
    },
    { key: 'warehouse', header: t('Warehouse'), render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'opname_date', header: t('Tanggal'), render: (row) => formatDate(row.opname_date) },
    { key: 'status', header: t('Status'), render: (row) => <StatusBadge status={row.status} /> },
    { key: 'notes', header: t('Catatan'), render: (row) => row.notes ?? '-' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t('Stock Opnames')}</h1>
        {canCreate && (
          <Link
            to="/stock-opnames/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('+ Tambah Opname')}
          </Link>
        )}
      </div>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-40">
          <SelectField
            label={t('Status')}
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as StockOpnameStatus | '')}
          >
            <option value="">{t('Semua')}</option>
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
              emptyMessage={t('Belum ada stock opname.')}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
