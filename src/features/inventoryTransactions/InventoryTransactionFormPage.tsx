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
import {
  createInventoryTransaction,
  getInventoryTransaction,
  updateInventoryTransaction,
} from '../../api/inventoryTransactions'
import type { InventoryTransactionKind } from '../../api/inventoryTransactions'
import type { InventoryTransactionDetailInput } from '../../types/inventoryTransaction'
import { getItemByBarcode } from '../../api/items'
import type { Item } from '../../types/item'
import { ItemFormModal } from '../items/ItemFormModal'
import { usePermissions } from '../../auth/permissions'
import { useI18n } from '../../i18n/useI18n'

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

interface InventoryTransactionFormPageProps {
  kind: InventoryTransactionKind
  title: string
}

export default function InventoryTransactionFormPage({ kind, title }: InventoryTransactionFormPageProps) {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const transactionId = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const basePath = kind === 'inbound' ? '/inbounds' : '/outbounds'
  const listQueryKey = kind === 'inbound' ? 'inbounds' : 'outbounds'
  const { canWrite } = usePermissions()
  const canCreateItem = canWrite('items')

  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [contactId, setContactId] = useState<number | null>(null)
  const [transactionDate, setTransactionDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  // Scan barcode (§18 frontend-integration-guide.md, 2026-09-13) — `notFoundBarcode` non-null
  // buka `ItemFormModal` mode create dengan barcode itu udah ke-prefill.
  const [barcodeInput, setBarcodeInput] = useState('')
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null)
  const [isReversal, setIsReversal] = useState(false)
  const [reversalOfId, setReversalOfId] = useState('')
  const [reversalReason, setReversalReason] = useState('')
  const [rows, setRows] = useState<DetailRow[]>([emptyRow()])

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: [listQueryKey, transactionId],
    queryFn: () => getInventoryTransaction(kind, transactionId as number),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing?.data) {
      const doc = existing.data
      setWarehouseId(doc.warehouse_id)
      setContactId(doc.contact_id)
      setTransactionDate(doc.transaction_date)
      setNotes(doc.notes ?? '')
      setIsReversal(!!doc.reversal_of_transaction_id)
      setReversalOfId(doc.reversal_of_transaction_id ? String(doc.reversal_of_transaction_id) : '')
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

  const mutation = useMutation({
    mutationFn: () => {
      const details: InventoryTransactionDetailInput[] = rows
        .filter((r) => r.item_id !== null)
        .map((r) => ({
          item_id: r.item_id as number,
          quantity: Number(r.quantity) || 0,
          unit_price: Number(r.unit_price) || 0,
        }))
      const body = {
        warehouse_id: warehouseId as number,
        contact_id: contactId,
        transaction_date: transactionDate,
        notes: notes.trim() || null,
        reversal_of_transaction_id: isReversal && reversalOfId ? Number(reversalOfId) : null,
        reversal_reason: isReversal ? reversalReason.trim() || null : null,
        details,
      }
      return isEdit
        ? updateInventoryTransaction(kind, transactionId as number, body)
        : createInventoryTransaction(kind, body)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [listQueryKey] })
      toast.show(isEdit ? t('{title} berhasil diupdate.', { title }) : t('{title} berhasil dibuat.', { title }), 'success')
      navigate(`${basePath}/${res.data.id}`)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  // Scan barcode (§18) — item yang sama nambah qty (bukan bikin baris baru), baris kosong yang
  // ada diisi duluan sebelum bikin baris baru. Unit Price cuma relevan buat inbound (outbound
  // tidak punya field ini di UI/API — harga keluar selalu dari alokasi FIFO), tapi tetap diisi di
  // state biar konsisten sama baris yang dibuat manual (yang juga selalu punya `unit_price` di
  // `DetailRow`, dipakai atau tidak tergantung `kind`).
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
    toast.show(t('{sku} — {name} ditambahkan.', { sku: item.sku, name: item.name }), 'success')
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
        if (canCreateItem) {
          setNotFoundBarcode(barcode)
        } else {
          toast.show(t('Barcode belum terdaftar. Minta admin-bu/purchasing daftarkan item ini.'), 'error')
        }
      } else {
        toast.show(getErrorMessage(err), 'error')
      }
    },
  })

  // Bukan `<form onSubmit>` terpisah SENGAJA — input ini duduk di dalam `<form>` besar milik
  // halaman, dan `<form>` bersarang itu HTML tidak valid (lihat catatan Fase 18). Enter di sini
  // ditangkap manual + `preventDefault()` biar tidak ikut men-trigger submit form utama.
  function submitScan() {
    const code = barcodeInput.trim()
    if (!code) return
    if (!warehouseId) {
      toast.show(t('Pilih warehouse dulu sebelum scan barcode.'), 'error')
      return
    }
    scanMutation.mutate(code)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!warehouseId) {
      toast.show(t('Warehouse wajib dipilih.'), 'error')
      return
    }
    const validRows = rows.filter((r) => r.item_id !== null && Number(r.quantity) > 0)
    if (validRows.length === 0) {
      toast.show(t('Minimal 1 baris item dengan quantity valid.'), 'error')
      return
    }
    if (isReversal && !reversalReason.trim()) {
      toast.show(t('Alasan reversal wajib diisi.'), 'error')
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
    return <p className="text-sm text-slate-400">{t('Memuat data...')}</p>
  }

  if (isEdit && existing && existing.data.status !== 'DRAFT') {
    return (
      <div>
        <p className="text-sm text-red-600">
          {t('Dokumen ini berstatus')} <strong>{existing.data.status}</strong> {t('dan tidak bisa diedit lagi.')}
        </p>
        <Link to={`${basePath}/${transactionId}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          {t('← Kembali ke detail')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to={basePath} className="text-sm text-blue-600 hover:underline">
        {t('← Kembali ke daftar {title}', { title: title.toLowerCase() })}
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold text-slate-900">
        {isEdit ? t('Edit {title}', { title }) : t('Tambah {title}', { title })}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <WarehouseSelect
            label={t('Warehouse')}
            required
            placeholder={t('-- pilih warehouse --')}
            value={warehouseId}
            onChange={setWarehouseId}
          />
          <ContactSelect label={t('Kontak (opsional)')} value={contactId} onChange={setContactId} />
          <TextField
            label={t('Tanggal Transaksi')}
            type="date"
            required
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </div>

        <TextareaField label={t('Catatan')} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isReversal}
              onChange={(e) => setIsReversal(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            {t('Ini adalah dokumen reversal/koreksi')}
          </label>
          {isReversal && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label={t('ID Transaksi Asal')}
                type="number"
                min={1}
                required
                value={reversalOfId}
                onChange={(e) => setReversalOfId(e.target.value)}
              />
              <TextField
                label={t('Alasan Reversal')}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label className="block text-sm font-medium text-blue-900">{t('Scan Barcode')}</label>
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
            placeholder={t('Arahkan scanner ke sini, atau ketik manual lalu Enter')}
            className="mt-1 block w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-blue-700">
            {t('Item ketemu langsung nambah baris (atau nambah qty kalau item-nya sudah ada di daftar di bawah). Belum ada warehouse dipilih? Pilih dulu — stok yang divalidasi khusus warehouse itu.')}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">{t('Detail Item')}</h2>
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {t('+ Tambah Baris')}
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-12 items-end gap-3 rounded-lg border border-slate-200 p-3">
                <div className={kind === 'inbound' ? 'col-span-5' : 'col-span-8'}>
                  <ItemPicker
                    value={row.item_id}
                    onChange={(itemId) => updateRow(row.key, { item_id: itemId })}
                    allowCreate
                  />
                </div>
                <div className={kind === 'inbound' ? 'col-span-2' : 'col-span-3'}>
                  <TextField
                    label={t('Qty')}
                    type="number"
                    min={0}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                  />
                </div>
                {kind === 'inbound' && (
                  <>
                    <div className="col-span-3">
                      <TextField
                        label={t('Unit Price')}
                        type="number"
                        min={0}
                        value={row.unit_price}
                        onChange={(e) => updateRow(row.key, { unit_price: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1 pb-2 text-sm text-slate-500">
                      {formatRupiah((Number(row.quantity) || 0) * (Number(row.unit_price) || 0))}
                    </div>
                  </>
                )}
                <div className="col-span-1 pb-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                    className="text-sm text-red-600 hover:underline disabled:opacity-30"
                  >
                    {t('Hapus')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to={basePath}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('Batal')}
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? t('Menyimpan...') : t('Simpan')}
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
