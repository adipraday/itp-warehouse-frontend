import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { SelectField } from '../../components/FormField'
import { formatNumber, formatRupiah } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { getItem, getItemCost, getItemCostHistory, listItemStocks } from '../../api/items'
import { listWarehouses } from '../../api/warehouses'
import type { ItemCostHistoryEntry, ItemStock } from '../../types/item'

type Tab = 'stocks' | 'cost'

const stockColumns: DataTableColumn<ItemStock>[] = [
  { key: 'warehouse_code', header: 'Kode Gudang', render: (row) => row.warehouse_code },
  { key: 'warehouse_name', header: 'Nama Gudang', render: (row) => row.warehouse_name },
  { key: 'quantity', header: 'Qty', className: 'text-right', render: (row) => formatNumber(row.quantity) },
]

const costHistoryColumns: DataTableColumn<ItemCostHistoryEntry>[] = [
  { key: 'created_at', header: 'Tanggal', render: (row) => formatTimestamp(row.created_at) },
  {
    key: 'quantity_received',
    header: 'Qty Masuk',
    className: 'text-right',
    render: (row) => formatNumber(row.quantity_received),
  },
  {
    key: 'quantity_remaining',
    header: 'Sisa',
    className: 'text-right',
    render: (row) => formatNumber(row.quantity_remaining),
  },
  { key: 'unit_cost', header: 'Unit Cost', className: 'text-right', render: (row) => formatRupiah(row.unit_cost) },
]

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const itemId = Number(id)
  const [tab, setTab] = useState<Tab>('stocks')
  const [stocksPage, setStocksPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)

  const { data: item } = useQuery({
    queryKey: ['items', itemId],
    queryFn: () => getItem(itemId),
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100 }),
  })

  const { data: stocks, isLoading: stocksLoading } = useQuery({
    queryKey: ['items', itemId, 'stocks', stocksPage],
    queryFn: () => listItemStocks(itemId, { page: stocksPage }),
    enabled: tab === 'stocks',
  })

  const { data: cost } = useQuery({
    queryKey: ['items', itemId, 'cost', warehouseId],
    queryFn: () => getItemCost(itemId, { warehouse_id: warehouseId as number }),
    enabled: tab === 'cost' && warehouseId !== null,
  })

  const { data: costHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['items', itemId, 'cost-history', warehouseId, historyPage],
    queryFn: () => getItemCostHistory(itemId, { warehouse_id: warehouseId as number, page: historyPage }),
    enabled: tab === 'cost' && warehouseId !== null,
  })

  return (
    <div>
      <Link to="/items" className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar item
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-slate-900">
        {item?.data.name ?? '...'} <span className="text-base font-normal text-slate-400">({item?.data.sku})</span>
      </h1>
      {item?.data && (
        <p className="mt-1 text-sm text-slate-500">
          Satuan: {item.data.unit} &middot; Min. stok: {item.data.min_stock} &middot; Harga jual:{' '}
          {formatRupiah(item.data.selling_price)}
          {item.data.barcode && <> &middot; Barcode: {item.data.barcode}</>}
        </p>
      )}

      <div className="mt-6 flex gap-1 border-b border-slate-200">
        <TabButton active={tab === 'stocks'} onClick={() => setTab('stocks')}>
          Stok Lintas Gudang
        </TabButton>
        <TabButton active={tab === 'cost'} onClick={() => setTab('cost')}>
          Cost / HPP
        </TabButton>
      </div>

      {tab === 'stocks' && (
        <div className="mt-4">
          <DataTable
            columns={stockColumns}
            data={stocks?.data ?? []}
            getRowKey={(row) => row.warehouse_id}
            loading={stocksLoading}
            emptyMessage="Item ini belum punya stok di gudang manapun."
          />
          {stocks?.meta && <Pagination meta={stocks.meta} onPageChange={setStocksPage} />}
        </div>
      )}

      {tab === 'cost' && (
        <div className="mt-4">
          <div className="max-w-xs">
            <SelectField
              label="Pilih Warehouse"
              required
              value={warehouseId ?? ''}
              onChange={(e) => {
                setWarehouseId(e.target.value ? Number(e.target.value) : null)
                setHistoryPage(1)
              }}
            >
              <option value="">-- pilih warehouse --</option>
              {warehouses?.data.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </SelectField>
          </div>

          {warehouseId === null && (
            <p className="mt-4 text-sm text-slate-400">Pilih warehouse dulu untuk lihat data cost/HPP.</p>
          )}

          {warehouseId !== null && cost && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <SummaryCard label="Qty Tersisa" value={formatNumber(cost.data.quantity_remaining)} />
              <SummaryCard label="Total Nilai" value={formatRupiah(cost.data.total_value)} />
              <SummaryCard label="Rata-rata Unit Cost" value={formatRupiah(cost.data.average_unit_cost)} />
            </div>
          )}

          {warehouseId !== null && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Riwayat Cost Layer</h2>
              <DataTable
                columns={costHistoryColumns}
                data={costHistory?.data ?? []}
                getRowKey={(row) => row.id}
                loading={historyLoading}
                emptyMessage="Belum ada riwayat cost layer di warehouse ini."
              />
              {costHistory?.meta && <Pagination meta={costHistory.meta} onPageChange={setHistoryPage} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}
