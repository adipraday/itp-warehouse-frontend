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

export default function CostLayerListPage() {
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
    { key: 'created_at', header: 'Tanggal', render: (row) => formatTimestamp(row.created_at) },
    { key: 'warehouse_id', header: 'Warehouse ID', render: (row) => row.warehouse_id },
    { key: 'item_id', header: 'Item ID', render: (row) => row.item_id },
    {
      key: 'quantity_received',
      header: 'Qty Masuk',
      className: 'text-right',
      render: (row) => formatNumber(row.quantity_received),
    },
    {
      key: 'quantity_remaining',
      header: 'Qty Tersisa',
      className: 'text-right',
      render: (row) => formatNumber(row.quantity_remaining),
    },
    { key: 'unit_cost', header: 'Unit Cost', className: 'text-right', render: (row) => formatRupiah(row.unit_cost) },
    {
      key: 'origin',
      header: 'Asal',
      render: (row) => (row.origin_cost_layer_id ? `Transfer dari layer #${row.origin_cost_layer_id}` : '-'),
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
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Cost Layers / HPP (FIFO)</h1>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-40">
          <TextField label="Dari Tanggal" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label="Sampai Tanggal" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </FilterBar>

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Qty Tersisa</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(summary.data.quantity_remaining)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Total Nilai Persediaan</p>
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
          Hanya yang masih tersisa
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
              emptyMessage="Tidak ada cost layer."
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
