import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '../../api/errors'
import { formatDate } from '../../utils/date'
import { formatRupiah, parseMoney } from '../../utils/money'
import { getWarehouse } from '../../api/warehouses'
import { getContact } from '../../api/contacts'
import { getInvoiceByKind } from '../../api/invoices'
import type { InvoiceKind } from '../../api/invoices'
import type { PaymentStatus } from '../../types/invoice'
import { COMPANY_NAME } from '../../config/company'

interface InvoicePrintPageProps {
  kind: InvoiceKind
  title: string
}

const WATERMARK_STYLE: Record<PaymentStatus, string> = {
  PAID: 'text-emerald-600/20',
  PARTIAL: 'text-amber-600/20',
  UNPAID: 'text-red-600/20',
}

const WATERMARK_LABEL: Record<PaymentStatus, string> = {
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  UNPAID: 'UNPAID',
}

export default function InvoicePrintPage({ kind }: InvoicePrintPageProps) {
  const { id } = useParams<{ id: string }>()
  const invoiceId = Number(id)
  const basePath = kind === 'sales' ? '/sales' : '/purchases'
  const contactLabel = kind === 'sales' ? 'Customer' : 'Supplier'
  const docLabel = kind === 'sales' ? 'Invoice Penjualan' : 'Invoice Pembelian'

  const { data: doc, isLoading, isError, error } = useQuery({
    queryKey: [kind, invoiceId],
    queryFn: () => getInvoiceByKind(kind, invoiceId),
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
    return <p className="p-8 text-sm text-slate-400">Memuat invoice...</p>
  }

  if (isError || !doc) {
    return (
      <div className="p-8 text-sm text-red-600">
        Gagal memuat invoice: {getErrorMessage(error)}
      </div>
    )
  }

  const d = doc.data
  const watermarkLabel = WATERMARK_LABEL[d.payment_status]
  const watermarkStyle = WATERMARK_STYLE[d.payment_status]

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="flex justify-center gap-3 border-b border-slate-200 bg-white p-4 print:hidden">
        <Link
          to={`${basePath}/${invoiceId}`}
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
        {/* Watermark status pembayaran — diagonal, di belakang konten, ikut kecetak. */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          <span
            className={`select-none whitespace-nowrap text-[10rem] font-black tracking-widest ${watermarkStyle}`}
            style={{ transform: 'rotate(-30deg)' }}
          >
            {watermarkLabel}
          </span>
        </div>

        <div className="relative">
          <div className="flex items-start justify-between border-b border-slate-300 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{COMPANY_NAME}</h1>
              <p className="text-sm text-slate-500">{warehouse?.data.name ?? '-'}</p>
              <p className="text-sm text-slate-500">{warehouse?.data.address ?? ''}</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-semibold uppercase tracking-wide text-slate-700">{docLabel}</h2>
              <p className="mt-1 font-mono text-sm text-slate-900">{d.invoice_number}</p>
              <p className="text-xs text-slate-400">Status Dokumen: {d.status}</p>
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
                <span className="text-slate-400">Tanggal Invoice: </span>
                {formatDate(d.invoice_date)}
              </p>
              {d.due_date && (
                <p>
                  <span className="text-slate-400">Jatuh Tempo: </span>
                  {formatDate(d.due_date)}
                </p>
              )}
              <p>
                <span className="text-slate-400">Status Pembayaran: </span>
                <strong>{d.payment_status}</strong>
              </p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2">SKU</th>
                <th className="py-2">Nama Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Harga</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(d.details ?? []).map((line) => (
                <tr key={line.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">{line.sku}</td>
                  <td className="py-2 text-slate-900">{line.name}</td>
                  <td className="py-2 text-right">{line.quantity}</td>
                  <td className="py-2 text-right">{formatRupiah(line.unit_price)}</td>
                  <td className="py-2 text-right">{formatRupiah(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatRupiah(d.subtotal)}</span>
            </div>
            {parseMoney(d.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Diskon</span>
                <span>-{formatRupiah(d.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Pajak</span>
              <span>{formatRupiah(d.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-bold">
              <span>Total</span>
              <span>{formatRupiah(d.total_amount)}</span>
            </div>
          </div>

          {d.notes && (
            <p className="mt-6 text-sm text-slate-500">
              <span className="text-slate-400">Catatan: </span>
              {d.notes}
            </p>
          )}

          <p className="mt-10 text-xs text-slate-400">
            Dicetak {formatDate(new Date().toISOString().slice(0, 10))} &middot; Dokumen ini dihasilkan
            otomatis oleh Warehouse System.
          </p>
        </div>
      </div>
    </div>
  )
}
