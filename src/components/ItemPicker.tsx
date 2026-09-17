import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getItem, searchItems } from '../api/items'
import { usePermissions } from '../auth/permissions'
import { ItemFormModal } from '../features/items/ItemFormModal'
import type { Item } from '../types/item'

interface ItemPickerProps {
  label?: string
  value: number | null
  onChange: (itemId: number | null) => void
  // Munculin shortcut "+ Tambah item baru" di bawah hasil pencarian — dibuat opt-in (bukan
  // otomatis dari canWrite('items')) karena `ItemPicker` juga dipakai di filter report read-only
  // (CostLayerListPage/StockMutationListPage/StockListPage) yang bukan konteks transaksi, jadi
  // aneh kalau nawarin "tambah item" di situ. Aktifkan cuma di form transaksi (inbound/outbound,
  // sales/purchase, stock transfer, opname) biar user nggak perlu tinggalin transaksi kalau
  // item-nya belum ada di master data.
  allowCreate?: boolean
}

/**
 * Search-select item (SKU/nama) yang resolve ke item_id. Dipakai di filter
 * report (Fase 3) dan bisa dipakai lagi untuk baris detail transaksi (Fase 4+).
 */
export function ItemPicker({ label = 'Item', value, onChange, allowCreate = false }: ItemPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { canWrite } = usePermissions()
  // Backend nolak 403 create item buat role yang bukan super-admin/admin-bu/purchasing (§5 WRITE_MATRIX)
  // — shortcut ini cuma ditampilkan buat role yang beneran boleh, biar nggak nawarin tombol yang
  // ujung-ujungnya ditolak backend (mis. staff-gudang pas inbound, kasir-sales pas sales).
  const canCreate = allowCreate && canWrite('items')

  const { data: selectedItem } = useQuery({
    queryKey: ['items', value],
    queryFn: () => getItem(value as number),
    enabled: value !== null,
  })

  const { data: results } = useQuery({
    queryKey: ['items', 'search', debouncedQuery],
    queryFn: () => searchItems({ q: debouncedQuery.trim(), per_page: 10 }),
    enabled: open && debouncedQuery.trim().length > 0,
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectItem(item: Item) {
    onChange(item.id)
    setQuery('')
    setOpen(false)
  }

  function clearSelection() {
    onChange(null)
    setQuery('')
  }

  function handleCreated(item: Item) {
    // Priming cache langsung pakai data yang baru dibuat — item terpilih kebaca instan tanpa
    // nunggu round-trip `GET /items/:id` lagi (query key sama persis yang dipakai `selectedItem`
    // di bawah).
    queryClient.setQueryData(['items', item.id], { data: item })
    onChange(item.id)
    setQuery('')
    setOpen(false)
    setCreateOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {value !== null && selectedItem ? (
          <div className="mt-1 flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm">
            <span>
              {selectedItem.data.sku} — {selectedItem.data.name}
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Hapus pilihan item"
            >
              &times;
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Cari SKU / nama item..."
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
      </label>

      {open && value === null && ((results && results.data.length > 0) || canCreate) && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {results?.data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(item)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {item.sku} — {item.name}
              </button>
            </li>
          ))}
          {canCreate && (
            <li className={results && results.data.length > 0 ? 'border-t border-slate-100' : undefined}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCreateOpen(true)}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                {query.trim() ? `+ Tambah "${query.trim()}" sebagai item baru` : '+ Tambah item baru'}
              </button>
            </li>
          )}
        </ul>
      )}

      {canCreate && (
        <ItemFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          initialName={query.trim()}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
