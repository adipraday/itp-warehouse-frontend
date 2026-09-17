import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextField, SelectField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { createWarehouse, listWarehouses, updateWarehouse } from '../../api/warehouses'
import type { Warehouse, WarehouseInput } from '../../types/warehouse'

interface WarehouseFormModalProps {
  open: boolean
  onClose: () => void
  warehouse?: Warehouse | null
}

const EMPTY_FORM = { code: '', name: '', address: '', parent_warehouse_id: '' as number | '' }

export function WarehouseFormModal({ open, onClose, warehouse }: WarehouseFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const queryClient = useQueryClient()
  const toast = useToast()

  // Kandidat parent = warehouse utama (parent_warehouse_id null) sendiri — cabang tidak boleh
  // punya cabang (kedalaman dibatasi 2 level, api-documentation.md §4), dan warehouse yang
  // sedang diedit tidak boleh jadi parent-nya sendiri. bu_id sama dicek final oleh backend
  // (`GET /warehouses` sudah otomatis ke-scope BU pemanggil, jadi daftar ini sudah relevan).
  const { data: warehouseList } = useQuery({
    queryKey: ['warehouses', 'all-main'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100 }),
    enabled: open,
  })
  const mainWarehouseOptions = (warehouseList?.data ?? []).filter(
    (w) => w.parent_warehouse_id == null && w.id !== warehouse?.id,
  )

  useEffect(() => {
    if (open) {
      setForm(
        warehouse
          ? {
              code: warehouse.code,
              name: warehouse.name,
              address: warehouse.address ?? '',
              parent_warehouse_id: warehouse.parent_warehouse_id ?? '',
            }
          : EMPTY_FORM,
      )
    }
  }, [open, warehouse])

  const mutation = useMutation({
    mutationFn: (input: WarehouseInput) =>
      warehouse ? updateWarehouse(warehouse.id, input) : createWarehouse(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.show(warehouse ? 'Warehouse berhasil diupdate.' : 'Warehouse berhasil dibuat.', 'success')
      onClose()
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      address: form.address?.trim() || null,
      parent_warehouse_id: form.parent_warehouse_id === '' ? null : Number(form.parent_warehouse_id),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={warehouse ? 'Edit Warehouse' : 'Tambah Warehouse'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Kode"
          required
          maxLength={50}
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          placeholder="WH-01"
        />
        <TextField
          label="Nama"
          required
          maxLength={100}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Gudang Utama"
        />
        <TextField
          label="Alamat"
          value={form.address ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Jl. Sudirman No. 1"
        />
        <SelectField
          label="Warehouse Utama (kosongkan kalau ini warehouse utama)"
          value={form.parent_warehouse_id}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              parent_warehouse_id: e.target.value === '' ? '' : Number(e.target.value),
            }))
          }
        >
          <option value="">-- Ini warehouse utama --</option>
          {mainWarehouseOptions.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </SelectField>
        {form.parent_warehouse_id !== '' && (
          <p className="text-xs text-slate-500">
            Warehouse ini akan jadi cabang dari warehouse yang dipilih. Satu business unit cuma
            boleh punya 1 warehouse utama, tapi boleh punya banyak cabang.
          </p>
        )}

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
