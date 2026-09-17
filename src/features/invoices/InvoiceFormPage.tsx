import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ContactSelect } from '../../components/ContactSelect'
import { ItemPicker } from '../../components/ItemPicker'
import { TextField, TextareaField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage, ApiError } from '../../api/errors'
import { todayISO } from '../../utils/date'
import { formatRupiah } from '../../utils/money'
import { createInvoiceByKind, getInvoiceByKind, updateInvoiceByKind } from '../../api/invoices'
import type { InvoiceKind } from '../../api/invoices'
import type { InvoiceDetailInput } from '../../types/invoice'
import { getItemByBarcode } from '../../api/items'
import type { Item } from '../../types/item'
import { ItemFormModal } from '../items/ItemFormModal'
import { usePermissions } from '../../auth/permissions'

interface DetailRow {
  key: number
  item_id: number | null
  quantity: string
  unit_price: string
}

let rowKeySeq = 1
function emptyRow(): DetailRow {
  return { key: rowKeySeq++, item_id: null, quantity: '1', unit_price: '0' }
}

interface InvoiceFormPageProps {
  kind: InvoiceKind
  title: string
}

export default function InvoiceFormPage({ kind, title }: InvoiceFormPageProps) {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const invoiceId = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const basePath = kind === 'sales' ? '/sales' : '/purchases'
  const contactType = kind === 'sales' ? 'customer' : 'supplier'
  const { canWrite } = usePermissions()
  const canCreateItem = canWrite('items')

  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [contactId, setContactId] = useState<number | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState('')
  // PPN default 11% untuk Sales & Purchase (permintaan user).
  const [taxRatePercent, setTaxRatePercent] = useState('11')
  // Diskon level transaksi, nominal (bukan persen) — §21 frontend-integration-guide.md
  // (2026-09-13), diterapkan sebelum pajak: taxable_base = subtotal - discount.
  const [discountAmount, setDiscountAmount] = useState('0')
  const [notes, setNotes] = useState('')
  const [isReversal, setIsReversal] = useState(false)
  const [reversalOfId, setReversalOfId] = useState('')
  const [reversalReason, setReversalReason] = useState('')
  const [rows, setRows] = useState<DetailRow[]>([emptyRow()])
  // Scan barcode (§18 frontend-integration-guide.md, 2026-09-13) — `notFoundBarcode` non-null
  // buka `ItemFormModal` mode create dengan barcode itu udah ke-prefill, buat kasus item belum
  // terdaftar sama sekali.
  const [barcodeInput, setBarcodeInput] = useState('')
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: [kind, invoiceId],
    queryFn: () => getInvoiceByKind(kind, invoiceId as number),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing?.data) {
      const doc = existing.data
      setWarehouseId(doc.warehouse_id)
      setContactId(doc.contact_id)
      setInvoiceDate(doc.invoice_date)
      setDueDate(doc.due_date ?? '')
      setDiscountAmount(doc.discount_amount ?? '0')
      setNotes(doc.notes ?? '')
      setIsReversal(!!doc.reversal_of_invoice_id)
      setReversalOfId(doc.reversal_of_invoice_id ? String(doc.reversal_of_invoice_id) : '')
      setReversalReason(doc.reversal_reason ?? '')
      if (doc.details && doc.details.length > 0) {
        setRows(
          doc.details.map((d) => ({
            key: rowKeySeq++,
            item_id: d.item_id,
            quantity: String(d.quantity),
            unit_price: d.unit_price,
          })),
        )
      }
    }
  }, [existing])

  const subtotal = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0)
  const taxRate = (Number(taxRatePercent) || 0) / 100
  const discountNum = Number(discountAmount) || 0
  // Sama persis urutan hitung backend (§21 frontend-integration-guide.md) — diskon diterapkan
  // SEBELUM pajak, jadi preview di sini match dengan yang bakal dihitung ulang server.
  const taxableBase = Math.max(subtotal - discountNum, 0)
  const taxAmount = taxableBase * taxRate
  const total = taxableBase + taxAmount

  const mutation = useMutation({
    mutationFn: () => {
      const details: InvoiceDetailInput[] = rows
        .filter((r) => r.item_id !== null)
        .map((r) => ({
          item_id: r.item_id as number,
          quantity: Number(r.quantity) || 0,
          unit_price: Number(r.unit_price) || 0,
        }))
      const body = {
        warehouse_id: warehouseId as number,
        contact_id: contactId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        tax_rate: taxRate,
        discount_amount: discountNum,
        notes: notes.trim() || null,
        reversal_of_invoice_id: isReversal && reversalOfId ? Number(reversalOfId) : null,
        reversal_reason: isReversal ? reversalReason.trim() || null : null,
        details,
      }
      return isEdit ? updateInvoiceByKind(kind, invoiceId as number, body) : createInvoiceByKind(kind, body)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [kind] })
      toast.show(isEdit ? `${title} berhasil diupdate.` : `${title} berhasil dibuat.`, 'success')
      navigate(`${basePath}/${res.data.id}`)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  // Scan barcode (§18) — item yang sama nambah qty (bukan bikin baris baru), baris kosong yang
  // ada diisi duluan sebelum bikin baris baru, harga jual dari master data langsung diisikan ke
  // Unit Price (bisa diedit manual kalau perlu) — meniru alur real POS: scan-scan-scan, harga
  // udah kepasang otomatis.
  function addScannedItem(item: Item) {
    setRows((prev) => {
      const existingIdx = prev.findIndex((r) => r.item_id === item.id)
      if (existingIdx !== -1) {
        const updated = [...prev]
        const row = updated[existingIdx]
        updated[existingIdx] = { ...row, quantity: String((Number(row.quantity) || 0) + 1) }
        return updated
      }
      const emptyIdx = prev.findIndex((r) => r.item_id === null)
      const filledRow: DetailRow = {
        key: emptyIdx !== -1 ? prev[emptyIdx].key : rowKeySeq++,
        item_id: item.id,
        quantity: '1',
        unit_price: item.selling_price,
      }
      if (emptyIdx !== -1) {
        const updated = [...prev]
        updated[emptyIdx] = filledRow
        return updated
      }
      return [...prev, filledRow]
    })
    toast.show(`${item.sku} — ${item.name} ditambahkan.`, 'success')
  }

  const scanMutation = useMutation({
    mutationFn: (barcode: string) => getItemByBarcode(barcode, warehouseId as number),
    onSuccess: (res) => {
      addScannedItem(res.data)
      setBarcodeInput('')
    },
    onError: (err, barcode) => {
      if (err instanceof ApiError && err.status === 404) {
        setBarcodeInput('')
        // Backend nolak 403 create item buat role yang bukan super-admin/admin-bu/purchasing
        // (§5 WRITE_MATRIX, sama gating kayak `ItemPicker` di Fase 18) — jangan buka form yang
        // ujungnya cuma bakal ditolak, kasih tahu langsung.
        if (canCreateItem) {
          setNotFoundBarcode(barcode)
        } else {
          toast.show('Barcode belum terdaftar. Minta admin-bu/purchasing daftarkan item ini.', 'error')
        }
      } else {
        toast.show(getErrorMessage(err), 'error')
      }
    },
  })

  // Bukan `<form onSubmit>` terpisah SENGAJA — input ini duduk di dalam `<form>` besar milik
  // halaman, dan `<form>` bersarang itu HTML tidak valid (lihat catatan Fase 18 di
  // `Modal.tsx`/`ItemPicker.tsx`). Enter di sini ditangkap manual + `preventDefault()` biar tidak
  // ikut men-trigger submit form utama.
  function submitScan() {
    const code = barcodeInput.trim()
    if (!code) return
    if (!warehouseId) {
      toast.show('Pilih warehouse dulu sebelum scan barcode.', 'error')
      return
    }
    scanMutation.mutate(code)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!warehouseId) {
      toast.show('Warehouse wajib dipilih.', 'error')
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
    if (discountNum > subtotal) {
      toast.show('Diskon tidak boleh melebihi subtotal.', 'error')
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
        <Link to={`${basePath}/${invoiceId}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          &larr; Kembali ke detail
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to={basePath} className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar {title.toLowerCase()}
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold text-slate-900">
        {isEdit ? `Edit ${title}` : `Tambah ${title}`}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <WarehouseSelect
            label="Warehouse"
            required
            placeholder="-- pilih warehouse --"
            value={warehouseId}
            onChange={setWarehouseId}
          />
          <ContactSelect
            label={kind === 'sales' ? 'Customer (opsional)' : 'Supplier (opsional)'}
            type={contactType}
            value={contactId}
            onChange={setContactId}
          />
          <TextField
            label="Tanggal Invoice"
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
          <TextField label="Jatuh Tempo (opsional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <TextField
            label="Tax Rate (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(e.target.value)}
          />
          <TextField
            label="Diskon (nominal, opsional)"
            type="number"
            min={0}
            max={subtotal}
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
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
                label="ID Invoice Asal"
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

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label className="block text-sm font-medium text-blue-900">Scan Barcode</label>
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitScan()
              }
            }}
            disabled={scanMutation.isPending}
            placeholder="Arahkan scanner ke sini, atau ketik manual lalu Enter"
            className="mt-1 block w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-blue-700">
            Item ketemu langsung nambah baris (atau nambah qty kalau item-nya sudah ada di daftar
            di bawah). Belum ada warehouse dipilih? Pilih dulu — stok yang divalidasi khusus
            warehouse itu.
          </p>
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
                <div className="col-span-5">
                  <ItemPicker
                    value={row.item_id}
                    onChange={(itemId) => updateRow(row.key, { item_id: itemId })}
                    allowCreate
                  />
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
                  <TextField
                    label="Unit Price"
                    type="number"
                    min={0}
                    value={row.unit_price}
                    onChange={(e) => updateRow(row.key, { unit_price: e.target.value })}
                  />
                </div>
                <div className="col-span-1 pb-2 text-sm text-slate-500">
                  {formatRupiah((Number(row.quantity) || 0) * (Number(row.unit_price) || 0))}
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

        <div className="ml-auto max-w-xs space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="text-xs text-slate-400">Preview (dihitung ulang oleh server saat disimpan)</p>
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {discountNum > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon</span>
              <span>-{formatRupiah(discountNum)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({taxRatePercent || 0}%)</span>
            <span>{formatRupiah(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to={basePath}
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

      {canCreateItem && (
        <ItemFormModal
          open={notFoundBarcode !== null}
          onClose={() => setNotFoundBarcode(null)}
          initialBarcode={notFoundBarcode ?? undefined}
          onCreated={(item) => {
            addScannedItem(item)
            setNotFoundBarcode(null)
          }}
        />
      )}
    </div>
  )
}
