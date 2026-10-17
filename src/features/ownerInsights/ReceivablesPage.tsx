import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { SimpleBarChart } from '../../components/SimpleBarChart'
import { StatCard } from '../../components/StatCard'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ReportActions, ReportPrintHeader } from '../../components/ReportActions'
import { getAging } from '../../api/dashboard'
import { listWarehouses } from '../../api/warehouses'
import { formatNumber, formatRupiah, parseMoney } from '../../utils/money'
import { formatDate, todayISO } from '../../utils/date'
import { downloadXlsx, reportFileName } from '../../utils/exportXlsx'
import { agingSheets } from './exportSheets'
import type { AgingBucket, AgingContact, AgingInvoice, AgingSide } from '../../types/dashboard'
import { useI18n } from '../../i18n/useI18n'
import { tk, translate } from '../../i18n/i18n'

interface SideInfo {
  title: string
  counterparty: string
  unknownCounterparty: string
  totalLabel: string
  emptyMessage: string
  invoicePath: (id: number) => string
}

const SIDES: Record<AgingSide, SideInfo> = {
  receivable: {
    title: tk('Piutang'),
    counterparty: tk('Pelanggan'),
    unknownCounterparty: tk('Pelanggan tanpa nama'),
    totalLabel: tk('Total piutang'),
    emptyMessage: tk('Tidak ada piutang. Semua penjualan sudah lunas.'),
    invoicePath: (id) => `/sales/${id}`,
  },
  payable: {
    title: tk('Hutang'),
    counterparty: tk('Pemasok'),
    unknownCounterparty: tk('Pemasok tanpa nama'),
    totalLabel: tk('Total hutang'),
    emptyMessage: tk('Tidak ada hutang. Semua pembelian sudah dibayar.'),
    invoicePath: (id) => `/purchases/${id}`,
  },
}

// Warna batang makin tua = makin lama menunggak. Maknanya juga tertulis di label tiap batang.
const BUCKET_COLOR: Record<AgingBucket['key'], string> = {
  current: 'bg-blue-500',
  d1_30: 'bg-amber-400',
  d31_60: 'bg-orange-500',
  d61_90: 'bg-red-500',
  d90_plus: 'bg-red-800',
}

function daysText(days: number): string {
  if (days <= 0) return days === 0 ? translate('Jatuh tempo hari ini') : translate('Jatuh tempo {v1} hari lagi', { v1: Math.abs(days) })
  return translate('Terlambat {v1} hari', { v1: formatNumber(days) })
}

// Piutang & Hutang — umur saldo yang belum lunas (aging), pihak dengan saldo terbesar, dan invoice
// tertua. Owner hanya memantau; pelunasan dicatat di halaman invoice oleh yang berwenang.
export default function ReceivablesPage() {
  const { t } = useI18n()
  const [side, setSide] = useState<AgingSide>('receivable')
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const info = SIDES[side]

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-aging', side, warehouseId],
    queryFn: () => getAging({ side, warehouse_id: warehouseId ?? undefined }),
  })
  const aging = data?.data

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'all', 'assigned'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100, scope: 'assigned' }),
    retry: false,
  })
  const warehouseName = (id: number) => warehousesData?.data.find((w) => w.id === id)?.name ?? `Warehouse #${id}`

  const contactColumns: DataTableColumn<AgingContact>[] = [
    {
      key: 'name',
      header: info.counterparty,
      render: (row) => row.contact_name ?? <span className="text-slate-400">{t(info.unknownCounterparty)}</span>,
    },
    { key: 'count', header: t('Invoice'), className: 'text-right', render: (row) => formatNumber(row.count) },
    { key: 'amount', header: t('Saldo'), className: 'text-right', render: (row) => formatRupiah(row.amount) },
    {
      key: 'oldest',
      header: t('Tertua'),
      render: (row) => (
        <span className={row.oldest_days_overdue > 0 ? 'text-slate-700' : 'text-slate-400'}>
          {daysText(row.oldest_days_overdue)}
        </span>
      ),
    },
  ]

  const invoiceColumns: DataTableColumn<AgingInvoice>[] = [
    {
      key: 'invoice',
      header: t('Invoice'),
      render: (row) => (
        <div>
          <Link to={info.invoicePath(row.invoice_id)} className="font-medium text-blue-600 hover:underline">
            {row.invoice_number}
          </Link>
          <p className="text-xs text-slate-400">{formatDate(row.invoice_date)}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: info.counterparty,
      render: (row) => row.contact_name ?? <span className="text-slate-400">{t(info.unknownCounterparty)}</span>,
    },
    { key: 'warehouse', header: t('Cabang'), render: (row) => warehouseName(row.warehouse_id) },
    {
      key: 'due',
      header: t('Jatuh tempo'),
      render: (row) => (
        <div>
          <p className={row.days_overdue >= 31 ? 'font-medium text-red-600' : 'text-slate-700'}>{daysText(row.days_overdue)}</p>
          <p className="text-xs text-slate-400">
            {row.due_date ? formatDate(row.due_date) : t('Tanpa jatuh tempo, dihitung dari tanggal invoice')}
          </p>
        </div>
      ),
    },
    { key: 'total', header: t('Total'), className: 'text-right', render: (row) => formatRupiah(row.total_amount) },
    { key: 'paid', header: t('Terbayar'), className: 'text-right', render: (row) => formatRupiah(row.paid_amount) },
    {
      key: 'outstanding',
      header: t('Sisa'),
      className: 'text-right',
      render: (row) => <span className="font-medium">{formatRupiah(row.outstanding)}</span>,
    },
  ]

  const overdueShare =
    aging && parseMoney(aging.total_outstanding) > 0
      ? Math.round((parseMoney(aging.overdue_total) / parseMoney(aging.total_outstanding)) * 100)
      : 0

  async function exportExcel() {
    const full = await getAging({ side, warehouse_id: warehouseId ?? undefined, limit: 1000 })
    await downloadXlsx(
      reportFileName(side === 'receivable' ? 'piutang' : 'hutang', todayISO()),
      agingSheets(
        full.data,
        { warehouseName, userName: (id) => `User #${id}` },
        { title: translate(info.title), counterparty: translate(info.counterparty) },
      ),
    )
  }

  return (
    <div>
      <ReportPrintHeader title={t('Piutang & Hutang')} subtitle={t('{title} per {v2}', { title: t(info.title), v2: formatDate(aging?.as_of ?? todayISO()) })} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">{t('Piutang & Hutang')}</h1>
          <p className="text-sm text-slate-500">
            {t('Saldo invoice yang belum lunas, dikelompokkan menurut umurnya.')}
          </p>
        </div>
        <ReportActions onExcel={exportExcel} disabled={!aging} />
      </div>

      <FilterBar>
        <div role="tablist" aria-label={t('Piutang atau hutang')} className="flex gap-2 pb-0.5">
          {(Object.keys(SIDES) as AgingSide[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={side === key}
              onClick={() => setSide(key)}
              className={`rounded-md border px-4 py-2 text-sm font-medium ${
                side === key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {SIDES[key].title}
            </button>
          ))}
        </div>
        <div className="w-56">
          <WarehouseSelect label={t('Cabang')} placeholder={t('Semua cabang')} value={warehouseId} onChange={setWarehouseId} />
        </div>
      </FilterBar>

      {isError ? (
        <div className="mt-4">
          <ErrorState error={error} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label={info.totalLabel}
              value={aging ? formatRupiah(aging.total_outstanding) : '...'}
              hint={aging ? t('{v1} invoice belum lunas', { v1: formatNumber(aging.invoice_count) }) : undefined}
            />
            <StatCard
              label={t('Sudah lewat jatuh tempo')}
              value={aging ? formatRupiah(aging.overdue_total) : '...'}
              hint={aging ? t('{v1} invoice, {overdueShare}% dari total', { v1: formatNumber(aging.overdue_count), overdueShare }) : undefined}
              tone={aging && aging.overdue_count > 0 ? 'warn' : 'default'}
            />
            <StatCard
              label={t('Belum jatuh tempo')}
              value={aging ? formatRupiah(aging.buckets.find((b) => b.key === 'current')?.amount ?? 0) : '...'}
            />
            <StatCard
              label={t('Terlama')}
              value={aging && aging.items[0] ? daysText(aging.items[0].days_overdue) : aging ? '—' : '...'}
              hint={aging?.items[0]?.invoice_number}
            />
          </div>

          {aging && aging.invoice_count === 0 ? (
            <p className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              {t(info.emptyMessage)}
            </p>
          ) : (
            <>
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs text-slate-500">{t('Umur saldo menurut jatuh tempo')}</p>
                <SimpleBarChart
                  bars={(aging?.buckets ?? []).map((bucket) => ({
                    label: t('{label} ({v2} invoice)', { label: t(bucket.label), v2: formatNumber(bucket.count) }),
                    value: parseMoney(bucket.amount),
                    colorClass: BUCKET_COLOR[bucket.key],
                  }))}
                />
              </div>

              <section className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-slate-700">{t(info.counterparty)} {t('dengan saldo terbesar')}</h2>
                <DataTable
                  columns={contactColumns}
                  data={aging?.by_contact ?? []}
                  getRowKey={(row) => row.contact_id ?? 'none'}
                  loading={isLoading}
                />
              </section>

              {(aging?.by_warehouse.length ?? 0) > 1 && (
                <section className="mt-6">
                  <h2 className="mb-2 text-sm font-semibold text-slate-700">{t('Per cabang')}</h2>
                  <DataTable
                    columns={[
                      { key: 'warehouse', header: t('Cabang'), render: (row) => warehouseName(row.warehouse_id) },
                      { key: 'count', header: t('Invoice'), className: 'text-right', render: (row) => formatNumber(row.count) },
                      { key: 'amount', header: t('Saldo'), className: 'text-right', render: (row) => formatRupiah(row.amount) },
                    ]}
                    data={aging?.by_warehouse ?? []}
                    getRowKey={(row) => row.warehouse_id}
                  />
                </section>
              )}

              <section className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-slate-700">{t('Invoice terlama')}</h2>
                {aging?.truncated && (
                  <p className="mb-2 text-xs text-slate-500">
                    {t('Menampilkan')} {formatNumber(aging.items.length)} {t('invoice tertua dari')} {formatNumber(aging.invoice_count)}.
                  </p>
                )}
                <DataTable
                  columns={invoiceColumns}
                  data={aging?.items ?? []}
                  getRowKey={(row) => row.invoice_id}
                  loading={isLoading}
                />
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
