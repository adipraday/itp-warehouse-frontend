import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ItemPicker } from '../../components/ItemPicker'
import { TextField } from '../../components/FormField'
import { formatNumber, formatRupiah } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { getCostSummary, listCostLayers } from '../../api/costLayers'
import type { CostLayer } from '../../types/costLayer'
import { useI18n } from '../../i18n/useI18n'
import { translate } from '../../i18n/i18n'

export default function CostLayerListPage() {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [itemId, setItemId] = useState<number | null>(null)
  const [remainingOnly, setRemainingOnly] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cost-layers', warehouseId, itemId, remainingOnly, page],
    queryFn: () =>
      listCostLayers({
        warehouse_id: warehouseId ?? undefined,
        item_id: itemId ?? undefined,
        remaining_only: remainingOnly,
        page,
      }),
  })

  const { data: summary } = useQuery({
    queryKey: ['cost-summary', warehouseId, from, to],
    queryFn: () => getCostSummary({ warehouse_id: warehouseId ?? undefined, from: from || undefined, to: to || undefined }),
  })

  const columns: DataTableColumn<CostLayer>[] = [
    { key: 'created_at', header: t('Tanggal'), render: (row) => formatTimestamp(row.created_at) },
    { key: 'warehouse_id', header: t('Warehouse ID'), render: (row) => row.warehouse_id },
    { key: 'sku', header: t('SKU'), render: (row) => row.sku ?? `#${row.item_id}` },
    { key: 'item_name', header: t('Nama Item'), render: (row) => row.item_name ?? '-' },
    {
      key: 'quantity_received',
      header: t('Qty Masuk'),
      className: 'text-right',
      render: (row) => formatNumber(row.quantity_received),
    },
    {
      key: 'quantity_remaining',
      header: t('Qty Tersisa'),
      className: 'text-right',
      render: (row) => formatNumber(row.quantity_remaining),
    },
    { key: 'unit_cost', header: t('Unit Cost'), className: 'text-right', render: (row) => formatRupiah(row.unit_cost) },
    {
      key: 'origin',
      header: t('Asal'),
      render: (row) => (row.origin_cost_layer_id ? translate('Transfer dari layer #{origin_cost_layer_id}', { origin_cost_layer_id: row.origin_cost_layer_id }) : '-'),
    },
  ]

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">{t('Cost Layers / HPP (FIFO)')}</h1>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-40">
          <TextField label={t('Dari Tanggal')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label={t('Sampai Tanggal')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </FilterBar>

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t('Qty Tersisa')}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(summary.data.quantity_remaining)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t('Total Nilai Persediaan')}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatRupiah(summary.data.total_value)}</p>
          </div>
        </div>
      )}

      <FilterBar>
        <div className="w-56">
          <ItemPicker value={itemId} onChange={resetPage(setItemId)} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={remainingOnly}
            onChange={(e) => resetPage(setRemainingOnly)(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          {t('Hanya yang masih tersisa')}
        </label>
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
              emptyMessage={t('Tidak ada cost layer.')}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
