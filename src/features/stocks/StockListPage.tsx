import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ItemPicker } from '../../components/ItemPicker'
import { formatNumber } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { exportStocks, listLowStock, listOutOfStock, listStocks } from '../../api/stocks'
import type { StockExportFormat } from '../../api/stocks'
import { getErrorMessage } from '../../api/errors'
import { useToast } from '../../hooks/useToast'
import { downloadBlob } from '../../utils/download'
import type { Stock } from '../../types/stock'
import { useI18n } from '../../i18n/useI18n'
import { tk } from '../../i18n/i18n'

type Tab = 'all' | 'low' | 'out'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: tk('Semua Stok') },
  { key: 'low', label: tk('Low Stock') },
  { key: 'out', label: tk('Out of Stock') },
]

export default function StockListPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('all')
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [itemId, setItemId] = useState<number | null>(null)
  const [exportFormat, setExportFormat] = useState<StockExportFormat>('pdf')
  const toast = useToast()

  // Export mengikuti tab yang aktif (Semua / Low Stock / Out of Stock) dan filter warehouse; filter item
  // tidak ikut (backend tidak mendukungnya) dan paginasi tidak berlaku — semua baris masuk satu file.
  const exportMutation = useMutation({
    mutationFn: () => exportStocks({ status: tab, format: exportFormat, warehouse_id: warehouseId ?? undefined }),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename ?? `stocks-export${tab === 'all' ? '' : `-${tab}`}.${exportFormat}`)
      toast.show(t('Export berhasil diunduh.'), 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stocks', tab, warehouseId, itemId, page],
    queryFn: () => {
      if (tab === 'low') return listLowStock({ warehouse_id: warehouseId ?? undefined, page })
      if (tab === 'out') return listOutOfStock({ warehouse_id: warehouseId ?? undefined, page })
      return listStocks({ warehouse_id: warehouseId ?? undefined, item_id: itemId ?? undefined, page })
    },
  })

  const columns: DataTableColumn<Stock>[] = [
    { key: 'warehouse_code', header: t('Gudang'), render: (row) => `${row.warehouse_code} — ${row.warehouse_name}` },
    { key: 'sku', header: t('SKU'), render: (row) => row.sku },
    { key: 'item_name', header: t('Nama Item'), render: (row) => row.item_name },
    { key: 'unit', header: t('Satuan'), render: (row) => row.unit },
    {
      key: 'quantity',
      header: t('Qty'),
      className: 'text-right',
      render: (row) => (
        <span className={row.quantity <= row.min_stock ? 'font-medium text-amber-600' : ''}>
          {formatNumber(row.quantity)}
        </span>
      ),
    },
    { key: 'min_stock', header: t('Min. Stok'), className: 'text-right', render: (row) => formatNumber(row.min_stock) },
    { key: 'updated_at', header: t('Update Terakhir'), render: (row) => formatTimestamp(row.updated_at) },
  ]

  function switchTab(next: Tab) {
    setTab(next)
    setPage(1)
    if (next !== 'all') setItemId(null)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{t('Stocks')}</h1>
        <div className="flex items-center gap-2">
          <select
            aria-label={t('Format export')}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as StockExportFormat)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="pdf">{t('PDF')}</option>
            <option value="xlsx">{t('XLSX')}</option>
            <option value="csv">{t('CSV')}</option>
          </select>
          <button
            type="button"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            title={t('Export mengikuti tab dan filter warehouse yang aktif (filter item tidak ikut)')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {exportMutation.isPending ? t('Menyiapkan...') : t('Export {label}', { label: t(TABS.find((tabItem) => tabItem.key === tab)?.label ?? '') })}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar>
        <div className="w-64">
          <WarehouseSelect
            value={warehouseId}
            onChange={(id) => {
              setWarehouseId(id)
              setPage(1)
            }}
          />
        </div>
        {tab === 'all' && (
          <div className="w-64">
            <ItemPicker
              value={itemId}
              onChange={(id) => {
                setItemId(id)
                setPage(1)
              }}
            />
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
              emptyMessage={t('Tidak ada data stok.')}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
