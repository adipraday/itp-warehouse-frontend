import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { createItem, updateItem } from '../../api/items'
import type { Item, ItemInput } from '../../types/item'

interface ItemFormModalProps {
  open: boolean
  onClose: () => void
  item?: Item | null
  // Prefill nama item pas dibuka dari mode create — dipakai `ItemPicker` buat nge-carry teks yang
  // sudah diketik user di kolom pencarian (mis. udah ngetik nama item yang ternyata belum ada).
  initialName?: string
  // Prefill barcode pas dibuka dari mode create — dipakai alur scan barcode (§18
  // frontend-integration-guide.md) waktu hasil scan 404 (belum terdaftar), biar user tinggal
  // isi sisa field tanpa perlu scan/ketik ulang barcode-nya.
  initialBarcode?: string
  // Dipanggil abis create (bukan edit) sukses, sebelum modal ketutup — dipakai `ItemPicker` buat
  // auto-select item yang baru dibuat tanpa perlu user cari ulang.
  onCreated?: (item: Item) => void
}

interface FormState {
  sku: string
  barcode: string
  name: string
  unit: string
  min_stock: string
  selling_price: string
}

const EMPTY_FORM: FormState = { sku: '', barcode: '', name: '', unit: '', min_stock: '0', selling_price: '0' }

export function ItemFormModal({ open, onClose, item, initialName, initialBarcode, onCreated }: ItemFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const queryClient = useQueryClient()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              sku: item.sku,
              barcode: item.barcode ?? '',
              name: item.name,
              unit: item.unit,
              min_stock: String(item.min_stock),
              selling_price: item.selling_price,
            }
          : { ...EMPTY_FORM, name: initialName ?? '', barcode: initialBarcode ?? '' },
      )
    }
  }, [open, item, initialName, initialBarcode])

  const mutation = useMutation({
    mutationFn: (input: ItemInput) => (item ? updateItem(item.id, input) : createItem(input)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.show(item ? 'Item berhasil diupdate.' : 'Item berhasil dibuat.', 'success')
      if (!item) onCreated?.(res.data)
      onClose()
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      unit: form.unit.trim(),
      min_stock: Number(form.min_stock) || 0,
      selling_price: Number(form.selling_price) || 0,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit Item' : 'Tambah Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="SKU"
          required
          maxLength={50}
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          placeholder="SKU-001"
        />
        <TextField
          label="Barcode (opsional)"
          maxLength={64}
          value={form.barcode}
          onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
          placeholder="8991234567890"
        />
        <TextField
          label="Nama"
          required
          maxLength={150}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Router TP-Link"
        />
        <TextField
          label="Satuan"
          required
          maxLength={20}
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          placeholder="pcs"
        />
        <TextField
          label="Min. Stok"
          type="number"
          min={0}
          value={form.min_stock}
          onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
        />
        <TextField
          label="Harga Jual"
          type="number"
          min={0}
          value={form.selling_price}
          onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
