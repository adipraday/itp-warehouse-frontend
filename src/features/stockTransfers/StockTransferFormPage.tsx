import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ItemPicker } from '../../components/ItemPicker'
import { TextField, TextareaField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { todayISO } from '../../utils/date'
import { createStockTransfer, getStockTransfer, updateStockTransfer } from '../../api/stockTransfers'
import type { StockTransferDetailInput } from '../../types/stockTransfer'

interface DetailRow {
  key: number
  item_id: number | null
  quantity: string
}

let rowKeySeq = 1
function emptyRow(): DetailRow {
  return { key: rowKeySeq++, item_id: null, quantity: '1' }
}

export default function StockTransferFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const transferId = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [sourceId, setSourceId] = useState<number | null>(null)
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [transferDate, setTransferDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [isReversal, setIsReversal] = useState(false)
  const [reversalOfId, setReversalOfId] = useState('')
  const [reversalReason, setReversalReason] = useState('')
  const [rows, setRows] = useState<DetailRow[]>([emptyRow()])

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['stock-transfers', transferId],
    queryFn: () => getStockTransfer(transferId as number),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing?.data) {
      const doc = existing.data
      setSourceId(doc.source_warehouse_id)
      setDestinationId(doc.destination_warehouse_id)
      setTransferDate(doc.transfer_date)
      setNotes(doc.notes ?? '')
      setIsReversal(!!doc.reversal_of_transfer_id)
      setReversalOfId(doc.reversal_of_transfer_id ? String(doc.reversal_of_transfer_id) : '')
      setReversalReason(doc.reversal_reason ?? '')
      if (doc.details && doc.details.length > 0) {
        setRows(doc.details.map((d) => ({ key: rowKeySeq++, item_id: d.item_id, quantity: String(d.quantity) })))
      }
    }
  }, [existing])

  const mutation = useMutation({
    mutationFn: () => {
      const details: StockTransferDetailInput[] = rows
        .filter((r) => r.item_id !== null)
        .map((r) => ({ item_id: r.item_id as number, quantity: Number(r.quantity) || 0 }))
      const body = {
        source_warehouse_id: sourceId as number,
        destination_warehouse_id: destinationId as number,
        transfer_date: transferDate,
        notes: notes.trim() || null,
        reversal_of_transfer_id: isReversal && reversalOfId ? Number(reversalOfId) : null,
        reversal_reason: isReversal ? reversalReason.trim() || null : null,
        details,
      }
      return isEdit ? updateStockTransfer(transferId as number, body) : createStockTransfer(body)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast.show(isEdit ? 'Stock transfer berhasil diupdate.' : 'Stock transfer berhasil dibuat.', 'success')
      navigate(`/stock-transfers/${res.data.id}`)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!sourceId || !destinationId) {
      toast.show('Warehouse asal dan tujuan wajib dipilih.', 'error')
      return
    }
    if (sourceId === destinationId) {
      toast.show('Warehouse asal dan tujuan tidak boleh sama.', 'error')
      return
    }
    const validRows = rows.filter((r) => r.item_id !== null && Number(r.quantity) > 0)
    if (validRows.length === 0) {
      toast.show('Minimal 1 baris item dengan quantity valid.', 'error')
      return
    }
    if (isReversal && !reversalReason.trim()) {
      toast.show('Alasan reversal wajib diisi.', 'error')
      return
    }
    mutation.mutate()
  }

  function updateRow(key: number, patch: Partial<DetailRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  if (isEdit && loadingExisting) {
    return <p className="text-sm text-slate-400">Memuat data...</p>
  }

  if (isEdit && existing && existing.data.status !== 'DRAFT') {
    return (
      <div>
        <p className="text-sm text-red-600">
          Dokumen ini berstatus <strong>{existing.data.status}</strong> dan tidak bisa diedit lagi.
        </p>
        <Link to={`/stock-transfers/${transferId}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          &larr; Kembali ke detail
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/stock-transfers" className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar stock transfer
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold text-slate-900">
        {isEdit ? 'Edit Stock Transfer' : 'Tambah Stock Transfer'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <WarehouseSelect
            label="Dari Warehouse"
            required
            placeholder="-- pilih warehouse asal --"
            value={sourceId}
            onChange={setSourceId}
          />
          <WarehouseSelect
            label="Ke Warehouse"
            required
            placeholder="-- pilih warehouse tujuan --"
            value={destinationId}
            onChange={setDestinationId}
          />
          <TextField
            label="Tanggal Transfer"
            type="date"
            required
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
          />
        </div>
        {sourceId !== null && destinationId !== null && sourceId === destinationId && (
          <p className="text-sm text-red-600">Warehouse asal dan tujuan tidak boleh sama.</p>
        )}

        <TextareaField label="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isReversal}
              onChange={(e) => setIsReversal(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Ini adalah dokumen reversal/koreksi
          </label>
          {isReversal && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="ID Transfer Asal"
                type="number"
                min={1}
                required
                value={reversalOfId}
                onChange={(e) => setReversalOfId(e.target.value)}
              />
              <TextField
                label="Alasan Reversal"
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Detail Item</h2>
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              + Tambah Baris
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-12 items-end gap-3 rounded-lg border border-slate-200 p-3">
                <div className="col-span-8">
                  <ItemPicker value={row.item_id} onChange={(itemId) => updateRow(row.key, { item_id: itemId })} />
                </div>
                <div className="col-span-3">
                  <TextField
                    label="Qty"
                    type="number"
                    min={0}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                  />
                </div>
                <div className="col-span-1 pb-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                    className="text-sm text-red-600 hover:underline disabled:opacity-30"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to="/stock-transfers"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}
