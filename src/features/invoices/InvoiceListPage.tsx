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
import { formatRupiah } from '../../utils/money'
import { listInvoicesByKind } from '../../api/invoices'
import type { InvoiceKind } from '../../api/invoices'
import { listWarehouses } from '../../api/warehouses'
import type { Invoice, InvoiceStatus } from '../../types/invoice'
import { usePermissions } from '../../auth/permissions'

const STATUS_OPTIONS: InvoiceStatus[] = ['DRAFT', 'COMPLETED', 'CANCELLED']

interface InvoiceListPageProps {
  kind: InvoiceKind
  title: string
}

export default function InvoiceListPage({ kind, title }: InvoiceListPageProps) {
  const { canWrite } = usePermissions()
  const canCreate = canWrite(kind === 'sales' ? 'sales' : 'purchases')
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  // Hold/resume (§22 frontend-integration-guide.md) SALES-only — filter ini cuma dirender &
  // dikirim ke query kalau `kind === 'sales'` (lihat komentar di `ListParams.held`, api/invoices.ts).
  const [heldFilter, setHeldFilter] = useState<'' | 'true' | 'false'>('')
  const basePath = kind === 'sales' ? '/sales' : '/purchases'
  const isSales = kind === 'sales'

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [kind, warehouseId, status, isSales ? heldFilter : null, page],
    queryFn: () =>
      listInvoicesByKind(kind, {
        warehouse_id: warehouseId ?? undefined,
        status: status || undefined,
        held: isSales && heldFilter ? heldFilter === 'true' : undefined,
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

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'No. Invoice',
      render: (row) => (
        <Link to={`${basePath}/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.invoice_number}
        </Link>
      ),
    },
    { key: 'warehouse', header: 'Warehouse', render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'invoice_date', header: 'Tanggal', render: (row) => formatDate(row.invoice_date) },
    {
      key: 'total_amount',
      header: 'Total',
      className: 'text-right',
      render: (row) => formatRupiah(row.total_amount),
    },
    { key: 'payment_status', header: 'Pembayaran', render: (row) => <StatusBadge status={row.payment_status} /> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    ...(isSales
      ? ([
          {
            key: 'held',
            header: 'Ditahan',
            render: (row: Invoice) =>
              row.held_at ? (
                <span className="text-amber-700">{row.hold_label || 'Ya'}</span>
              ) : (
                <span className="text-slate-300">-</span>
              ),
          },
        ] as DataTableColumn<Invoice>[])
      : []),
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
            onChange={(e) => resetPage(setStatus)(e.target.value as InvoiceStatus | '')}
          >
            <option value="">Semua</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>
        {isSales && (
          <div className="w-40">
            <SelectField
              label="Tertahan"
              value={heldFilter}
              onChange={(e) => resetPage(setHeldFilter)(e.target.value as '' | 'true' | 'false')}
            >
              <option value="">Semua</option>
              <option value="true">Ya, tertahan</option>
              <option value="false">Tidak</option>
            </SelectField>
          </div>
        )}
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
