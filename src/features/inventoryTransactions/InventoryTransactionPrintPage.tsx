import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '../../api/errors'
import { formatDate } from '../../utils/date'
import { getWarehouse } from '../../api/warehouses'
import { getContact } from '../../api/contacts'
import { getInventoryTransaction } from '../../api/inventoryTransactions'
import type { InventoryTransactionKind } from '../../api/inventoryTransactions'
import { COMPANY_NAME } from '../../config/company'

interface InventoryTransactionPrintPageProps {
  kind: InventoryTransactionKind
}

export default function InventoryTransactionPrintPage({ kind }: InventoryTransactionPrintPageProps) {
  const { id } = useParams<{ id: string }>()
  const transactionId = Number(id)
  const basePath = kind === 'inbound' ? '/inbounds' : '/outbounds'
  const listQueryKey = kind === 'inbound' ? 'inbounds' : 'outbounds'
  const contactLabel = kind === 'inbound' ? 'Diterima dari (Supplier)' : 'Dikirim ke (Customer)'
  const docLabel = kind === 'inbound' ? 'Surat Jalan — Barang Masuk' : 'Surat Jalan — Barang Keluar'
  const directionLabel = kind === 'inbound' ? 'MASUK' : 'KELUAR'

  const { data: doc, isLoading, isError, error } = useQuery({
    queryKey: [listQueryKey, transactionId],
    queryFn: () => getInventoryTransaction(kind, transactionId),
  })

  const { data: warehouse } = useQuery({
    queryKey: ['warehouses', doc?.data.warehouse_id],
    queryFn: () => getWarehouse(doc?.data.warehouse_id as number),
    enabled: !!doc?.data.warehouse_id,
  })

  const { data: contact } = useQuery({
    queryKey: ['contacts', doc?.data.contact_id],
    queryFn: () => getContact(doc?.data.contact_id as number),
    enabled: !!doc?.data.contact_id,
  })

  // Buka dialog cetak (Save as PDF) otomatis begitu data siap — jeda dikit biar layout kelar
  // ke-render dulu (kalau browser blokir auto-print, tombol "Cetak" manual tetap tersedia).
  useEffect(() => {
    if (!doc) return
    const timer = setTimeout(() => window.print(), 400)
    return () => clearTimeout(timer)
  }, [doc])

  if (isLoading) {
    return <p className="p-8 text-sm text-slate-400">Memuat data...</p>
  }

  if (isError || !doc) {
    return <div className="p-8 text-sm text-red-600">Gagal memuat data: {getErrorMessage(error)}</div>
  }

  const d = doc.data
  // Cuma dokumen COMPLETED yang jadi bukti sah barang benar-benar sudah bergerak — draft/batal
  // ditandai jelas biar tidak ketuker jadi "bukti" beneran kalau kepencet cetak sebelum selesai.
  const showDraftWatermark = d.status !== 'COMPLETED'

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="flex justify-center gap-3 border-b border-slate-200 bg-white p-4 print:hidden">
        <Link
          to={`${basePath}/${transactionId}`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          &larr; Kembali
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Cetak / Simpan PDF
        </button>
      </div>

      <div className="relative mx-auto max-w-3xl overflow-hidden bg-white p-10 shadow-sm print:shadow-none">
        {showDraftWatermark && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <span
              className="select-none whitespace-nowrap text-[9rem] font-black tracking-widest text-slate-400/25"
              style={{ transform: 'rotate(-30deg)' }}
            >
              {d.status}
            </span>
          </div>
        )}

        <div className="relative">
          <div className="flex items-start justify-between border-b border-slate-300 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{COMPANY_NAME}</h1>
              <p className="text-sm text-slate-500">{warehouse?.data.name ?? '-'}</p>
              <p className="text-sm text-slate-500">{warehouse?.data.address ?? ''}</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-semibold uppercase tracking-wide text-slate-700">{docLabel}</h2>
              <p className="mt-1 font-mono text-sm text-slate-900">{d.transaction_number}</p>
              <p className="text-xs text-slate-400">Status: {d.status}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{contactLabel}</p>
              <p className="font-medium text-slate-900">{contact?.data.name ?? '-'}</p>
              {contact?.data.address && <p className="text-slate-500">{contact.data.address}</p>}
              {contact?.data.phone && <p className="text-slate-500">{contact.data.phone}</p>}
            </div>
            <div className="text-right">
              <p>
                <span className="text-slate-400">Tanggal: </span>
                {formatDate(d.transaction_date)}
              </p>
              <p>
                <span className="text-slate-400">Arah Barang: </span>
                <strong>{directionLabel}</strong>
              </p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 w-10">No.</th>
                <th className="py-2">SKU</th>
                <th className="py-2">Nama Item</th>
                <th className="py-2 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {(d.details ?? []).map((line, idx) => (
                <tr key={line.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-400">{idx + 1}</td>
                  <td className="py-2 text-slate-500">{line.sku}</td>
                  <td className="py-2 text-slate-900">{line.name}</td>
                  <td className="py-2 text-right">{line.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {d.notes && (
            <p className="mt-6 text-sm text-slate-500">
              <span className="text-slate-400">Catatan: </span>
              {d.notes}
            </p>
          )}

          <div className="mt-16 grid grid-cols-3 gap-6 text-center text-sm">
            <div>
              <p className="text-slate-500">Dikirim oleh,</p>
              <div className="mt-16 border-t border-slate-400 pt-1 text-xs text-slate-400">
                (Nama &amp; Tanda Tangan)
              </div>
            </div>
            <div>
              <p className="text-slate-500">Diterima oleh,</p>
              <div className="mt-16 border-t border-slate-400 pt-1 text-xs text-slate-400">
                (Nama &amp; Tanda Tangan)
              </div>
            </div>
            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <div className="mt-16 border-t border-slate-400 pt-1 text-xs text-slate-400">
                (Nama &amp; Tanda Tangan)
              </div>
            </div>
          </div>

          <p className="mt-10 text-xs text-slate-400">
            Dicetak {formatDate(new Date().toISOString().slice(0, 10))} &middot; Dokumen ini dihasilkan
            otomatis oleh Warehouse System.
          </p>
        </div>
      </div>
    </div>
  )
}
