import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { TextField } from '../../components/FormField'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatRupiah } from '../../utils/money'
import { listItems, searchItems } from '../../api/items'
import type { Item } from '../../types/item'
import { ItemFormModal } from './ItemFormModal'
import { usePermissions } from '../../auth/permissions'
import { BuLabel } from '../../components/BuLabel'
import { hasMultipleBuIds } from '../../utils/bu'

export default function ItemListPage() {
  const { canWrite } = usePermissions()
  const canManage = canWrite('items')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)

  const isSearching = debouncedSearch.trim().length > 0

  const { data, isLoading, isError, error } = useQuery({
    queryKey: isSearching ? ['items', 'search', debouncedSearch, page] : ['items', page],
    queryFn: () =>
      isSearching ? searchItems({ q: debouncedSearch.trim(), page }) : listItems({ page }),
  })

  // Items sekarang di-scope per BU juga (§15 frontend-integration-guide.md) — kolom "BU" cuma
  // tampil kalau datanya beneran lintas >1 BU, sama pola kayak WarehouseListPage (§14).
  const showBuColumn = hasMultipleBuIds(data?.data ?? [])

  const columns: DataTableColumn<Item>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => (
        <Link to={`/items/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.sku}
        </Link>
      ),
    },
    { key: 'name', header: 'Nama', render: (row) => row.name },
    {
      key: 'barcode',
      header: 'Barcode',
      render: (row) => row.barcode || <span className="text-slate-300">-</span>,
    },
    { key: 'unit', header: 'Satuan', render: (row) => row.unit },
    { key: 'min_stock', header: 'Min. Stok', className: 'text-right', render: (row) => row.min_stock },
    {
      key: 'selling_price',
      header: 'Harga Jual',
      className: 'text-right',
      render: (row) => formatRupiah(row.selling_price),
    },
    ...(showBuColumn
      ? ([{ key: 'bu', header: 'BU', render: (row: Item) => <BuLabel buId={row.bu_id} /> }] as DataTableColumn<Item>[])
      : []),
    ...(canManage
      ? ([
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (row: Item) => (
              <button
                type="button"
                onClick={() => {
                  setEditing(row)
                  setFormOpen(true)
                }}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Edit
              </button>
            ),
          },
        ] as DataTableColumn<Item>[])
      : []),
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Items</h1>
        {canManage && (
          <div className="flex gap-2">
            <Link
              to="/items/import"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Import / Export
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Tambah Item
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 max-w-sm">
        <TextField
          label="Cari SKU / Nama"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Ketik untuk mencari..."
        />
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            getRowKey={(row) => row.id}
            loading={isLoading}
            emptyMessage={isSearching ? 'Tidak ada item yang cocok.' : 'Belum ada item.'}
          />
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      <ItemFormModal open={formOpen} onClose={() => setFormOpen(false)} item={editing} />
    </div>
  )
}
