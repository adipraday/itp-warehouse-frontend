import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { formatNumber } from '../../utils/money'
import { getWarehouse, getWarehouseStockSummary, listWarehouseStocks } from '../../api/warehouses'
import type { WarehouseStock } from '../../types/warehouse'

const columns: DataTableColumn<WarehouseStock>[] = [
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'name', header: 'Nama Item', render: (row) => row.name },
  { key: 'unit', header: 'Satuan', render: (row) => row.unit },
  {
    key: 'quantity',
    header: 'Qty',
    className: 'text-right',
    render: (row) => (
      <span className={row.quantity <= row.min_stock ? 'font-medium text-red-600' : ''}>
        {formatNumber(row.quantity)}
      </span>
    ),
  },
  { key: 'min_stock', header: 'Min. Stok', className: 'text-right', render: (row) => formatNumber(row.min_stock) },
]

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const warehouseId = Number(id)
  const [page, setPage] = useState(1)

  const { data: warehouse } = useQuery({
    queryKey: ['warehouses', warehouseId],
    queryFn: () => getWarehouse(warehouseId),
  })

  const parentId = warehouse?.data.parent_warehouse_id
  const { data: parentWarehouse } = useQuery({
    queryKey: ['warehouses', parentId],
    queryFn: () => getWarehouse(parentId as number),
    enabled: parentId != null,
  })

  const { data: summary } = useQuery({
    queryKey: ['warehouses', warehouseId, 'stock-summary'],
    queryFn: () => getWarehouseStockSummary(warehouseId),
  })

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['warehouses', warehouseId, 'stocks', page],
    queryFn: () => listWarehouseStocks(warehouseId, { page }),
  })

  return (
    <div>
      <Link to="/warehouses" className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar warehouse
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-slate-900">
        {warehouse?.data.name ?? '...'}{' '}
        <span className="text-base font-normal text-slate-400">({warehouse?.data.code})</span>
      </h1>
      {warehouse?.data.address && <p className="mt-1 text-sm text-slate-500">{warehouse.data.address}</p>}
      {parentId != null && (
        <p className="mt-1 text-sm text-slate-500">
          Cabang dari:{' '}
          <Link to={`/warehouses/${parentId}`} className="text-blue-600 hover:underline">
            {parentWarehouse ? `${parentWarehouse.data.code} — ${parentWarehouse.data.name}` : `#${parentId}`}
          </Link>
        </p>
      )}

      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Total Item" value={formatNumber(summary.data.total_items)} />
          <SummaryCard label="Total Qty" value={formatNumber(summary.data.total_quantity)} />
          <SummaryCard label="Low Stock" value={formatNumber(summary.data.low_stock_count)} warn />
          <SummaryCard label="Out of Stock" value={formatNumber(summary.data.out_of_stock_count)} warn />
        </div>
      )}

      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-700">Stok per Item</h2>
      <DataTable
        columns={columns}
        data={stocks?.data ?? []}
        getRowKey={(row) => row.item_id}
        loading={isLoading}
        emptyMessage="Belum ada stok di warehouse ini."
      />
      {stocks?.meta && <Pagination meta={stocks.meta} onPageChange={setPage} />}
    </div>
  )
}

function SummaryCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${warn ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
