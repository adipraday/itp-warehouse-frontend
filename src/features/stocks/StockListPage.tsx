import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ItemPicker } from '../../components/ItemPicker'
import { formatNumber } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { listLowStock, listOutOfStock, listStocks } from '../../api/stocks'
import type { Stock } from '../../types/stock'

type Tab = 'all' | 'low' | 'out'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Semua Stok' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
]

export default function StockListPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [itemId, setItemId] = useState<number | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stocks', tab, warehouseId, itemId, page],
    queryFn: () => {
      if (tab === 'low') return listLowStock({ warehouse_id: warehouseId ?? undefined, page })
      if (tab === 'out') return listOutOfStock({ warehouse_id: warehouseId ?? undefined, page })
      return listStocks({ warehouse_id: warehouseId ?? undefined, item_id: itemId ?? undefined, page })
    },
  })

  const columns: DataTableColumn<Stock>[] = [
    { key: 'warehouse_code', header: 'Gudang', render: (row) => `${row.warehouse_code} — ${row.warehouse_name}` },
    { key: 'sku', header: 'SKU', render: (row) => row.sku },
    { key: 'item_name', header: 'Nama Item', render: (row) => row.item_name },
    { key: 'unit', header: 'Satuan', render: (row) => row.unit },
    {
      key: 'quantity',
      header: 'Qty',
      className: 'text-right',
      render: (row) => (
        <span className={row.quantity <= row.min_stock ? 'font-medium text-amber-600' : ''}>
          {formatNumber(row.quantity)}
        </span>
      ),
    },
    { key: 'min_stock', header: 'Min. Stok', className: 'text-right', render: (row) => formatNumber(row.min_stock) },
    { key: 'updated_at', header: 'Update Terakhir', render: (row) => formatTimestamp(row.updated_at) },
  ]

  function switchTab(next: Tab) {
    setTab(next)
    setPage(1)
    if (next !== 'all') setItemId(null)
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Stocks</h1>

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
              emptyMessage="Tidak ada data stok."
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
