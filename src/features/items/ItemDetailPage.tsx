import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { SelectField } from '../../components/FormField'
import { formatNumber, formatRupiah } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { getItem, getItemCost, getItemCostHistory, listItemStocks } from '../../api/items'
import { listWarehouses } from '../../api/warehouses'
import { usePermissions } from '../../auth/permissions'
import { DeleteItemDialog } from './DeleteItemDialog'
import type { ItemCostHistoryEntry, ItemStock } from '../../types/item'
import { useI18n } from '../../i18n/useI18n'
import { tk } from '../../i18n/i18n'

type Tab = 'stocks' | 'cost'

const stockColumns: DataTableColumn<ItemStock>[] = [
  { key: 'warehouse_code', header: tk('Kode Gudang'), render: (row) => row.warehouse_code },
  { key: 'warehouse_name', header: tk('Nama Gudang'), render: (row) => row.warehouse_name },
  { key: 'quantity', header: tk('Qty'), className: 'text-right', render: (row) => formatNumber(row.quantity) },
]

const costHistoryColumns: DataTableColumn<ItemCostHistoryEntry>[] = [
  { key: 'created_at', header: tk('Tanggal'), render: (row) => formatTimestamp(row.created_at) },
  {
    key: 'quantity_received',
    header: tk('Qty Masuk'),
    className: 'text-right',
    render: (row) => formatNumber(row.quantity_received),
  },
  {
    key: 'quantity_remaining',
    header: tk('Sisa'),
    className: 'text-right',
    render: (row) => formatNumber(row.quantity_remaining),
  },
  { key: 'unit_cost', header: tk('Unit Cost'), className: 'text-right', render: (row) => formatRupiah(row.unit_cost) },
]

export default function ItemDetailPage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const itemId = Number(id)
  const navigate = useNavigate()
  const { canWrite } = usePermissions()
  const [deleteOpen, setDeleteOpen] = useState(false)
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
        {t('← Kembali ke daftar item')}
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-slate-900">
        {item?.data.name ?? '...'} <span className="text-base font-normal text-slate-400">({item?.data.sku})</span>
      </h1>
      {item?.data.deleted_at && (
        <p role="status" className="mt-3 rounded-md border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">
          {t('Item ini sudah dihapus pada')} {formatTimestamp(item.data.deleted_at)}{t('. Riwayatnya tetap tersimpan, tetapi item tidak bisa dipakai di dokumen baru.')}
        </p>
      )}
      {item?.data && !item.data.deleted_at && canWrite('items') && (
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          {t('Hapus Item')}
        </button>
      )}
      {item?.data && (
        <p className="mt-1 text-sm text-slate-500">
          {t('Satuan:')} {item.data.unit} {t('· Min. stok:')} {item.data.min_stock} {t('· Harga jual:')}{' '}
          {formatRupiah(item.data.selling_price)}
          {item.data.barcode && <> {t('· Barcode:')} {item.data.barcode}</>}
        </p>
      )}

      <div className="mt-6 flex gap-1 border-b border-slate-200">
        <TabButton active={tab === 'stocks'} onClick={() => setTab('stocks')}>
          {t('Stok Lintas Gudang')}
        </TabButton>
        <TabButton active={tab === 'cost'} onClick={() => setTab('cost')}>
          {t('Cost / HPP')}
        </TabButton>
      </div>

      {tab === 'stocks' && (
        <div className="mt-4">
          <DataTable
            columns={stockColumns}
            data={stocks?.data ?? []}
            getRowKey={(row) => row.warehouse_id}
            loading={stocksLoading}
            emptyMessage={t('Item ini belum punya stok di gudang manapun.')}
          />
          {stocks?.meta && <Pagination meta={stocks.meta} onPageChange={setStocksPage} />}
        </div>
      )}

      {tab === 'cost' && (
        <div className="mt-4">
          <div className="max-w-xs">
            <SelectField
              label={t('Pilih Warehouse')}
              required
              value={warehouseId ?? ''}
              onChange={(e) => {
                setWarehouseId(e.target.value ? Number(e.target.value) : null)
                setHistoryPage(1)
              }}
            >
              <option value="">{t('-- pilih warehouse --')}</option>
              {warehouses?.data.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </SelectField>
          </div>

          {warehouseId === null && (
            <p className="mt-4 text-sm text-slate-400">{t('Pilih warehouse dulu untuk lihat data cost/HPP.')}</p>
          )}

          {warehouseId !== null && cost && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <SummaryCard label={t('Qty Tersisa')} value={formatNumber(cost.data.quantity_remaining)} />
              <SummaryCard label={t('Total Nilai')} value={formatRupiah(cost.data.total_value)} />
              <SummaryCard label={t('Rata-rata Unit Cost')} value={formatRupiah(cost.data.average_unit_cost)} />
            </div>
          )}

          {warehouseId !== null && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">{t('Riwayat Cost Layer')}</h2>
              <DataTable
                columns={costHistoryColumns}
                data={costHistory?.data ?? []}
                getRowKey={(row) => row.id}
                loading={historyLoading}
                emptyMessage={t('Belum ada riwayat cost layer di warehouse ini.')}
              />
              {costHistory?.meta && <Pagination meta={costHistory.meta} onPageChange={setHistoryPage} />}
            </div>
          )}
        </div>
      )}
      <DeleteItemDialog
        item={deleteOpen && item?.data ? item.data : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate('/items')}
      />
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
