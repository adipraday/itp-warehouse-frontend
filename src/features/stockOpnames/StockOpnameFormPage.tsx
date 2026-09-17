import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ItemPicker } from '../../components/ItemPicker'
import { TextField, TextareaField } from '../../components/FormField'
import { DifferenceBadge } from '../../components/DifferenceBadge'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { todayISO } from '../../utils/date'
import { formatNumber } from '../../utils/money'
import { listStocks } from '../../api/stocks'
import { createStockOpname, getStockOpname, updateStockOpname } from '../../api/stockOpnames'
import type { StockOpnameDetailInput } from '../../types/stockOpname'

interface DetailRow {
  key: number
  item_id: number | null
  physical_qty: string
  notes: string
}

let rowKeySeq = 1
function emptyRow(): DetailRow {
  return { key: rowKeySeq++, item_id: null, physical_qty: '0', notes: '' }
}

export default function StockOpnameFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const opnameId = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [opnameDate, setOpnameDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [isReversal, setIsReversal] = useState(false)
  const [reversalOfId, setReversalOfId] = useState('')
  const [reversalReason, setReversalReason] = useState('')
  const [rows, setRows] = useState<DetailRow[]>([emptyRow()])

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['stock-opnames', opnameId],
    queryFn: () => getStockOpname(opnameId as number),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing?.data) {
      const doc = existing.data
      setWarehouseId(doc.warehouse_id)
      setOpnameDate(doc.opname_date)
      setNotes(doc.notes ?? '')
      setIsReversal(!!doc.reversal_of_stock_opname_id)
      setReversalOfId(doc.reversal_of_stock_opname_id ? String(doc.reversal_of_stock_opname_id) : '')
      setReversalReason(doc.reversal_reason ?? '')
      if (doc.details && doc.details.length > 0) {
        setRows(
          doc.details.map((d) => ({
            key: rowKeySeq++,
            item_id: d.item_id,
            physical_qty: String(d.physical_qty),
            notes: d.notes ?? '',
          })),
        )
      }
    }
  }, [existing])

  const mutation = useMutation({
    mutationFn: () => {
      const details: StockOpnameDetailInput[] = rows
        .filter((r) => r.item_id !== null)
        .map((r) => ({
          item_id: r.item_id as number,
          physical_qty: Number(r.physical_qty) || 0,
          notes: r.notes.trim() || null,
        }))
      const body = {
        warehouse_id: warehouseId as number,
        opname_date: opnameDate,
        notes: notes.trim() || null,
        reversal_of_stock_opname_id: isReversal && reversalOfId ? Number(reversalOfId) : null,
        reversal_reason: isReversal ? reversalReason.trim() || null : null,
        details,
      }
      return isEdit ? updateStockOpname(opnameId as number, body) : createStockOpname(body)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opnames'] })
      toast.show(isEdit ? 'Stock opname berhasil diupdate.' : 'Stock opname berhasil dibuat.', 'success')
      navigate(`/stock-opnames/${res.data.id}`)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!warehouseId) {
      toast.show('Warehouse wajib dipilih.', 'error')
      return
    }
    const validRows = rows.filter((r) => r.item_id !== null)
    if (validRows.length === 0) {
      toast.show('Minimal 1 baris item.', 'error')
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
        <Link to={`/stock-opnames/${opnameId}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          &larr; Kembali ke detail
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/stock-opnames" className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar stock opname
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold text-slate-900">
        {isEdit ? 'Edit Stock Opname' : 'Tambah Stock Opname'}
      </h1>

      <p className="mb-6 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
        Isi <strong>hasil hitung fisik</strong> (Physical Qty) per item. Sistem akan snapshot qty sistem saat
        ini (system_qty) otomatis saat disimpan — kolom "Qty Sistem" di bawah cuma <strong>perkiraan</strong> dari
        stok saat ini untuk bantu preview selisih, nilai final ditentukan backend saat data disimpan.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <WarehouseSelect
            label="Warehouse"
            required
            placeholder="-- pilih warehouse --"
            value={warehouseId}
            onChange={setWarehouseId}
          />
          <TextField
            label="Tanggal Opname"
            type="date"
            required
            value={opnameDate}
            onChange={(e) => setOpnameDate(e.target.value)}
          />
        </div>

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
                label="ID Opname Asal"
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
              <OpnameFormRow
                key={row.key}
                row={row}
                warehouseId={warehouseId}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => removeRow(row.key)}
                canRemove={rows.length > 1}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to="/stock-opnames"
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

interface OpnameFormRowProps {
  row: DetailRow
  warehouseId: number | null
  onChange: (patch: Partial<DetailRow>) => void
  onRemove: () => void
  canRemove: boolean
}

function OpnameFormRow({ row, warehouseId, onChange, onRemove, canRemove }: OpnameFormRowProps) {
  const { data: stocks } = useQuery({
    queryKey: ['stocks', warehouseId, row.item_id],
    queryFn: () => listStocks({ warehouse_id: warehouseId ?? undefined, item_id: row.item_id ?? undefined }),
    enabled: warehouseId !== null && row.item_id !== null,
  })

  const estimatedSystemQty = stocks?.data[0]?.quantity ?? 0
  const showEstimate = warehouseId !== null && row.item_id !== null
  const estimatedDifference = (Number(row.physical_qty) || 0) - estimatedSystemQty

  return (
    <div className="grid grid-cols-12 items-end gap-3 rounded-lg border border-slate-200 p-3">
      <div className="col-span-4">
        <ItemPicker value={row.item_id} onChange={(itemId) => onChange({ item_id: itemId })} />
      </div>
      <div className="col-span-2">
        <TextField
          label="Physical Qty"
          type="number"
          min={0}
          value={row.physical_qty}
          onChange={(e) => onChange({ physical_qty: e.target.value })}
        />
      </div>
      <div className="col-span-2">
        <span className="block text-sm font-medium text-slate-700">Qty Sistem (estimasi)</span>
        <p className="mt-1 py-2 text-sm text-slate-500">{showEstimate ? formatNumber(estimatedSystemQty) : '-'}</p>
      </div>
      <div className="col-span-2">
        <span className="block text-sm font-medium text-slate-700">Selisih (estimasi)</span>
        <div className="mt-1 py-1.5">{showEstimate ? <DifferenceBadge value={estimatedDifference} /> : '-'}</div>
      </div>
      <div className="col-span-1">
        <TextField label="Catatan" value={row.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </div>
      <div className="col-span-1 pb-2 text-right">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="text-sm text-red-600 hover:underline disabled:opacity-30"
        >
          Hapus
        </button>
      </div>
    </div>
  )
}
