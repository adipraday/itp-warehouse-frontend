import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ContactSelect } from '../../components/ContactSelect'
import { TextField, TextareaField, SelectField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { todayISO } from '../../utils/date'
import { formatNumber } from '../../utils/money'
import { createReturn, getReturn, updateReturn } from '../../api/returns'
import { listInvoicesByKind, getInvoiceByKind } from '../../api/invoices'
import { listInventoryTransactions, getInventoryTransaction } from '../../api/inventoryTransactions'
import type { ReturnAction, ReturnCondition, ReturnDetailInput, ReturnType } from '../../types/return'

interface OriginItem {
  item_id: number
  sku: string
  name: string
  quantity: number
}

interface DetailRow {
  key: number
  item_id: number | null
  quantity: string
  condition: ReturnCondition
  action: ReturnAction
}

let rowKeySeq = 1
function emptyRow(): DetailRow {
  return { key: rowKeySeq++, item_id: null, quantity: '1', condition: 'GOOD', action: 'RESTOCK' }
}

function allowedActions(condition: ReturnCondition, type: ReturnType): ReturnAction[] {
  if (condition === 'DAMAGED') return ['SCRAP']
  return type === 'RETURN_CUSTOMER' ? ['RESTOCK', 'REPLACE', 'SCRAP'] : ['RESTOCK', 'SCRAP']
}

const ACTION_LABEL: Record<ReturnAction, string> = {
  RESTOCK: 'Masuk stok lagi',
  REPLACE: 'Ganti barang baru',
  SCRAP: 'Musnahkan (scrap)',
}

export default function ReturnFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const returnId = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [type, setType] = useState<ReturnType>('RETURN_CUSTOMER')
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [contactId, setContactId] = useState<number | null>(null)
  const [originId, setOriginId] = useState<number | null>(null)
  const [returnDate, setReturnDate] = useState(todayISO())
  const [reason, setReason] = useState('')
  const [rows, setRows] = useState<DetailRow[]>([emptyRow()])

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['returns', returnId],
    queryFn: () => getReturn(returnId as number),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing?.data) {
      const doc = existing.data
      setType(doc.type)
      setWarehouseId(doc.warehouse_id)
      setContactId(doc.contact_id)
      setOriginId(doc.original_invoice_id ?? doc.original_inventory_transaction_id)
      setReturnDate(doc.return_date)
      setReason(doc.reason ?? '')
      if (doc.details && doc.details.length > 0) {
        setRows(
          doc.details.map((d) => ({
            key: rowKeySeq++,
            item_id: d.item_id,
            quantity: String(d.quantity),
            condition: d.condition,
            action: d.action,
          })),
        )
      }
    }
  }, [existing])

  // Daftar dokumen origin yang eligible (COMPLETED) untuk warehouse+tipe yang dipilih — cuma dipakai saat create.
  // Dinormalisasi ke {id,label} di sini (bukan return response mentah) supaya query punya 1 tipe hasil yang
  // konsisten walau sumbernya beda endpoint (sales vs inbound) tergantung tipe retur.
  const { data: originOptions } = useQuery({
    queryKey: ['return-origin-options', type, warehouseId],
    queryFn: async () => {
      if (type === 'RETURN_CUSTOMER') {
        const res = await listInvoicesByKind('sales', {
          warehouse_id: warehouseId ?? undefined,
          status: 'COMPLETED',
          per_page: 100,
        })
        return res.data.map((d) => ({ id: d.id, label: d.invoice_number }))
      }
      const res = await listInventoryTransactions('inbound', {
        warehouse_id: warehouseId ?? undefined,
        status: 'COMPLETED',
        per_page: 100,
      })
      return res.data.map((d) => ({ id: d.id, label: d.transaction_number }))
    },
    enabled: !isEdit && warehouseId !== null,
  })

  // Detail dokumen origin terpilih — dipakai untuk batasi pilihan item di baris detail.
  // Sama seperti di atas, dinormalisasi ke OriginItem[] di dalam queryFn.
  const { data: originItems = [] } = useQuery({
    queryKey: ['return-origin-detail', type, originId],
    queryFn: async (): Promise<OriginItem[]> => {
      if (type === 'RETURN_CUSTOMER') {
        const res = await getInvoiceByKind('sales', originId as number)
        return (res.data.details ?? []).map((d) => ({ item_id: d.item_id, sku: d.sku, name: d.name, quantity: d.quantity }))
      }
      const res = await getInventoryTransaction('inbound', originId as number)
      return (res.data.details ?? []).map((d) => ({ item_id: d.item_id, sku: d.sku, name: d.name, quantity: d.quantity }))
    },
    enabled: originId !== null,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const details: ReturnDetailInput[] = rows
        .filter((r) => r.item_id !== null)
        .map((r) => ({
          item_id: r.item_id as number,
          quantity: Number(r.quantity) || 0,
          condition: r.condition,
          action: r.action,
        }))
      const body = {
        warehouse_id: warehouseId as number,
        contact_id: contactId as number,
        type,
        original_invoice_id: type === 'RETURN_CUSTOMER' ? originId : null,
        original_inventory_transaction_id: type === 'RETURN_SUPPLIER' ? originId : null,
        return_date: returnDate,
        reason: reason.trim() || null,
        details,
      }
      return isEdit ? updateReturn(returnId as number, body) : createReturn(body)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      toast.show(isEdit ? 'Retur berhasil diupdate.' : 'Retur berhasil dibuat.', 'success')
      navigate(`/returns/${res.data.id}`)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!warehouseId || !contactId) {
      toast.show('Warehouse dan kontak wajib dipilih.', 'error')
      return
    }
    if (!originId) {
      toast.show('Dokumen asal (origin) wajib dipilih.', 'error')
      return
    }
    const validRows = rows.filter((r) => r.item_id !== null && Number(r.quantity) > 0)
    if (validRows.length === 0) {
      toast.show('Minimal 1 baris item dengan quantity valid.', 'error')
      return
    }
    mutation.mutate()
  }

  function updateRow(key: number, patch: Partial<DetailRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        const next = { ...r, ...patch }
        if (patch.condition && !allowedActions(next.condition, type).includes(next.action)) {
          next.action = allowedActions(next.condition, type)[0]
        }
        return next
      }),
    )
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
        <Link to={`/returns/${returnId}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          &larr; Kembali ke detail
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/returns" className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar retur
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold text-slate-900">{isEdit ? 'Edit Retur' : 'Tambah Retur'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <span className="text-sm font-medium text-slate-700">Tipe Retur</span>
          {isEdit ? (
            <p className="mt-1 text-sm text-slate-900">
              {type === 'RETURN_CUSTOMER' ? 'Retur dari Customer' : 'Retur ke Supplier'}{' '}
              <span className="text-slate-400">(tidak bisa diubah setelah dibuat)</span>
            </p>
          ) : (
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={type === 'RETURN_CUSTOMER'}
                  onChange={() => {
                    setType('RETURN_CUSTOMER')
                    setOriginId(null)
                    setContactId(null)
                  }}
                />
                Retur dari Customer (barang balik dari pembeli)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={type === 'RETURN_SUPPLIER'}
                  onChange={() => {
                    setType('RETURN_SUPPLIER')
                    setOriginId(null)
                    setContactId(null)
                  }}
                />
                Retur ke Supplier (barang balik ke pemasok)
              </label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <WarehouseSelect
            label="Warehouse"
            required
            placeholder="-- pilih warehouse --"
            value={warehouseId}
            onChange={(v) => {
              setWarehouseId(v)
              if (!isEdit) setOriginId(null)
            }}
          />
          <ContactSelect
            label={type === 'RETURN_CUSTOMER' ? 'Customer' : 'Supplier'}
            required
            type={type === 'RETURN_CUSTOMER' ? 'customer' : 'supplier'}
            value={contactId}
            onChange={setContactId}
          />
          <TextField
            label="Tanggal Retur"
            type="date"
            required
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>

        <div>
          <span className="text-sm font-medium text-slate-700">
            Dokumen Asal ({type === 'RETURN_CUSTOMER' ? 'Sales invoice yang sudah COMPLETED' : 'Inbound yang sudah COMPLETED'})
          </span>
          {isEdit ? (
            <p className="mt-1 text-sm text-slate-900">
              #{originId} <span className="text-slate-400">(tidak bisa diubah setelah dibuat)</span>
            </p>
          ) : (
            <div className="mt-1 max-w-sm">
              {warehouseId === null ? (
                <p className="text-sm text-slate-400">Pilih warehouse dulu.</p>
              ) : (
                <select
                  value={originId ?? ''}
                  onChange={(e) => setOriginId(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- pilih dokumen asal --</option>
                  {originOptions?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <TextareaField label="Alasan" value={reason} onChange={(e) => setReason(e.target.value)} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Detail Item</h2>
            {originId !== null && (
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                + Tambah Baris
              </button>
            )}
          </div>

          {originId === null ? (
            <p className="text-sm text-slate-400">Pilih dokumen asal dulu untuk mulai isi detail item.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const options = allowedActions(row.condition, type)
                const originItem = originItems.find((oi) => oi.item_id === row.item_id)
                return (
                  <div key={row.key} className="grid grid-cols-12 items-end gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="col-span-3">
                      <SelectField
                        label="Item"
                        value={row.item_id ?? ''}
                        onChange={(e) => updateRow(row.key, { item_id: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">-- pilih item --</option>
                        {originItems.map((oi) => (
                          <option key={oi.item_id} value={oi.item_id}>
                            {oi.sku} — {oi.name}
                          </option>
                        ))}
                      </SelectField>
                      {originItem && (
                        <p className="mt-1 text-xs text-slate-400">Qty asli di dokumen: {formatNumber(originItem.quantity)}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <TextField
                        label="Qty"
                        type="number"
                        min={0}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3">
                      <SelectField
                        label="Kondisi"
                        value={row.condition}
                        onChange={(e) => updateRow(row.key, { condition: e.target.value as ReturnCondition })}
                      >
                        <option value="GOOD">Baik (GOOD)</option>
                        <option value="DAMAGED">Rusak (DAMAGED)</option>
                      </SelectField>
                    </div>
                    <div className="col-span-3">
                      <SelectField
                        label="Aksi"
                        value={row.action}
                        disabled={options.length === 1}
                        onChange={(e) => updateRow(row.key, { action: e.target.value as ReturnAction })}
                      >
                        {options.map((a) => (
                          <option key={a} value={a}>
                            {ACTION_LABEL[a]}
                          </option>
                        ))}
                      </SelectField>
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
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to="/returns"
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
