import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useToast } from '../../hooks/useToast'
import { ApiError, getErrorMessage } from '../../api/errors'
import { deleteItem } from '../../api/items'
import { listWarehouses } from '../../api/warehouses'
import { formatNumber } from '../../utils/money'
import type { Item } from '../../types/item'

interface DeleteItemDialogProps {
  item: Item | null
  onClose: () => void
  onDeleted?: () => void
}

interface StockDetail {
  warehouse_id: number
  quantity: number
}

interface DocumentDetail {
  type: string
  number: string
  status: string
}

// Hapus item = mengarsipkan: hilang dari daftar/pemilih/scan, riwayat tetap utuh. Backend hanya
// mengizinkan bila stok 0 di SEMUA gudang dan tidak ada dokumen yang belum selesai memakainya.
// Penolakannya dijelaskan di dalam dialog (gudang mana yang masih menyimpan, dokumen mana yang
// masih memakai) supaya pengguna tahu langkah berikutnya, bukan sekadar "gagal".
export function DeleteItemDialog({ item, onClose, onDeleted }: DeleteItemDialogProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [error, setError] = useState<unknown>(null)

  // Nama gudang hanya untuk memperjelas pesan; gagal dimuat → "Warehouse #id".
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all', 'assigned'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100, scope: 'assigned' }),
    enabled: item != null,
    retry: false,
  })
  const warehouseName = (id: number) => warehouses?.data.find((w) => w.id === id)?.name ?? `Warehouse #${id}`

  const mutation = useMutation({
    mutationFn: (id: number) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['stocks'] })
      toast.show('Item dihapus.', 'success')
      onDeleted?.()
      handleClose()
    },
    onError: (err) => setError(err),
  })

  function handleClose() {
    setError(null)
    mutation.reset()
    onClose()
  }

  const apiError = error instanceof ApiError ? error : null
  const stockDetails = apiError?.code === 'ITEM_HAS_STOCK' ? (apiError.details as StockDetail[]) : []
  const documentDetails = apiError?.code === 'ITEM_IN_OPEN_DOCUMENTS' ? (apiError.details as DocumentDetail[]) : []

  return (
    <Modal open={item != null} onClose={handleClose} title="Hapus Item">
      {item && (
        <>
          <p className="text-sm text-slate-600">
            Hapus <span className="font-medium text-slate-900">{item.name}</span> ({item.sku})? Item tidak akan muncul
            lagi di daftar, pencarian, dan scan, dan SKU serta barcode-nya bisa dipakai item baru. Riwayat transaksi
            lama tetap utuh.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Syarat: stok item ini harus 0 di semua gudang, dan tidak ada dokumen yang belum selesai yang memakainya.
          </p>

          {error != null && (
            <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiError?.code === 'ITEM_HAS_STOCK' ? (
                <>
                  <p className="font-medium">Stok item ini belum 0.</p>
                  <ul className="mt-1 list-disc pl-5">
                    {stockDetails.map((detail) => (
                      <li key={detail.warehouse_id}>
                        {warehouseName(detail.warehouse_id)}: {formatNumber(detail.quantity)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">
                    Habiskan lewat penjualan atau barang keluar, pindahkan lewat transfer, atau sesuaikan lewat stok
                    opname, lalu coba hapus lagi.
                  </p>
                </>
              ) : apiError?.code === 'ITEM_IN_OPEN_DOCUMENTS' ? (
                <>
                  <p className="font-medium">Item ini masih dipakai dokumen yang belum selesai.</p>
                  <ul className="mt-1 list-disc pl-5">
                    {documentDetails.map((detail) => (
                      <li key={detail.number}>
                        {detail.type} {detail.number} ({detail.status})
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">Selesaikan, batalkan, atau hapus dokumen itu dulu, lalu coba lagi.</p>
                </>
              ) : (
                getErrorMessage(error)
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {error != null ? 'Tutup' : 'Batal'}
            </button>
            {(error == null || (apiError?.status ?? 0) >= 500) && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  mutation.mutate(item.id)
                }}
                disabled={mutation.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
