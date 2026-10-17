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
import { listAllInvoices } from '../../api/invoicesCombined'
import { listWarehouses } from '../../api/warehouses'
import type { Invoice, InvoiceStatus, InvoiceType, PaymentStatus } from '../../types/invoice'
import { useI18n } from '../../i18n/useI18n'

const TYPE_OPTIONS: InvoiceType[] = ['SALES', 'PURCHASE']
const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['UNPAID', 'PARTIAL', 'PAID']
const STATUS_OPTIONS: InvoiceStatus[] = ['DRAFT', 'COMPLETED', 'CANCELLED']

export default function AllInvoicesListPage() {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [type, setType] = useState<InvoiceType | ''>('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [warehouseId, setWarehouseId] = useState<number | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoices-all', type, paymentStatus, status, warehouseId, page],
    queryFn: () =>
      listAllInvoices({
        type: type || undefined,
        payment_status: paymentStatus || undefined,
        status: status || undefined,
        warehouse_id: warehouseId ?? undefined,
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
      header: t('No. Invoice'),
      render: (row) => (
        <Link
          to={row.type === 'SALES' ? `/sales/${row.id}` : `/purchases/${row.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.invoice_number}
        </Link>
      ),
    },
    { key: 'type', header: t('Tipe'), render: (row) => row.type },
    { key: 'warehouse', header: t('Warehouse'), render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'invoice_date', header: t('Tanggal'), render: (row) => formatDate(row.invoice_date) },
    {
      key: 'total_amount',
      header: t('Total'),
      className: 'text-right',
      render: (row) => formatRupiah(row.total_amount),
    },
    { key: 'payment_status', header: t('Pembayaran'), render: (row) => <StatusBadge status={row.payment_status} /> },
    { key: 'status', header: t('Status'), render: (row) => <StatusBadge status={row.status} /> },
  ]

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">{t('Semua Invoice')}</h1>
      <p className="mb-6 text-sm text-slate-500">
        {t('Gabungan Sales + Purchase, read-only. Untuk membuat atau mengubah invoice, buka halaman')}{' '}
        <Link to="/sales" className="text-blue-600 hover:underline">
          {t('Sales')}
        </Link>{' '}
        {t('atau')}{' '}
        <Link to="/purchases" className="text-blue-600 hover:underline">
          {t('Purchases')}
        </Link>{' '}
        {t('sesuai tipenya.')}
      </p>

      <FilterBar>
        <div className="w-36">
          <SelectField label={t('Tipe')} value={type} onChange={(e) => resetPage(setType)(e.target.value as InvoiceType | '')}>
            <option value="">{t('Semua')}</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-40">
          <SelectField
            label={t('Status')}
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as InvoiceStatus | '')}
          >
            <option value="">{t('Semua')}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-40">
          <SelectField
            label={t('Pembayaran')}
            value={paymentStatus}
            onChange={(e) => resetPage(setPaymentStatus)(e.target.value as PaymentStatus | '')}
          >
            <option value="">{t('Semua')}</option>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
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
              getRowKey={(row) => `${row.type}-${row.id}`}
              loading={isLoading}
              emptyMessage={t('Belum ada invoice.')}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
