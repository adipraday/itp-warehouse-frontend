import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { useToast } from '../../hooks/useToast'
import { usePermissions } from '../../auth/permissions'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatTimestamp } from '../../utils/date'
import { formatRupiah, parseMoney } from '../../utils/money'
import { paymentMethodLabel } from '../../types/payment'
import { getWarehouse } from '../../api/warehouses'
import { getContact } from '../../api/contacts'
import { listPayments } from '../../api/payments'
import { deleteInvoiceByKind, getInvoiceByKind } from '../../api/invoices'
import { submitPurchase } from '../../api/purchases'
import type { InvoiceDetail, PurchaseRefund } from '../../types/invoice'
import { PaymentFormModal } from '../payments/PaymentFormModal'
import { ReceivePurchaseModal } from './ReceivePurchaseModal'
import { CancelPurchaseModal } from './CancelPurchaseModal'
import { PurchaseRefundModal } from './PurchaseRefundModal'
import { SupplierInvoiceCard } from './SupplierInvoiceCard'
import { isAwaitingGoods, purchaseStage } from './purchaseStage'

type ActiveDialog = 'submit' | 'delete' | null

// Detail Purchase dengan alur persetujuan gudang (2026-10-14):
//   Draft → dibayar → diajukan ke gudang → admin-warehouse tujuan menerima → stok bertambah.
// Kekurangan barang bisa ditunggu penggantinya atau ditutup dengan pengembalian dana; pembatalan
// juga menghasilkan pengembalian dana bila sudah dibayar.
export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const purchaseId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const { canWrite, canApprove, canRefundPurchase, role, userId } = usePermissions()
  const canWritePurchase = canWrite('purchases')
  const canRecordPayment = canWrite('payments')

  const { data: doc, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => getInvoiceByKind('purchase', purchaseId),
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

  const { data: payments } = useQuery({
    queryKey: ['payments', purchaseId],
    queryFn: () => listPayments({ invoice_id: purchaseId, per_page: 100 }),
    enabled: !!doc,
  })

  const submitMutation = useMutation({
    mutationFn: () => submitPurchase(purchaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      toast.show('Pembelian diajukan ke gudang untuk persetujuan.', 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoiceByKind('purchase', purchaseId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['purchase', purchaseId] })
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      toast.show('Purchase dihapus.', 'success')
      navigate('/purchases')
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  if (isLoading || !doc) {
    return <p className="text-sm text-slate-400">Memuat data...</p>
  }

  const d = doc.data
  const stage = purchaseStage(d)
  const awaiting = isAwaitingGoods(d)
  const isDraft = d.status === 'DRAFT' && !d.receipt_status
  const total = parseMoney(d.total_amount)
  const paid = parseMoney(d.paid_amount ?? '0')
  const refundDue = parseMoney(d.refund_due ?? '0')
  const remainingBalance = Math.max(0, total - paid)
  const isFullyPaid = d.payment_status === 'PAID' || total === 0
  const detailRows = d.details ?? []
  const showReceiveColumns = detailRows.some((r) => (r.received_quantity ?? 0) > 0 || (r.closed_quantity ?? 0) > 0) || awaiting

  // Backend memutuskan akhirnya; ini hanya menyembunyikan tombol yang pasti ditolak: admin-warehouse
  // tidak boleh menyetujui pembelian yang ia buat sendiri.
  const isOwnPurchase = role === 'admin-warehouse' && d.created_by != null && d.created_by === userId
  const canReceive = awaiting && canApprove('purchases') && !isOwnPurchase
  const canEditDocument = d.status !== 'CANCELLED' && canWritePurchase

  const detailColumns: DataTableColumn<InvoiceDetail>[] = [
    { key: 'sku', header: 'SKU', render: (row) => row.sku },
    { key: 'name', header: 'Nama Item', render: (row) => row.name },
    { key: 'quantity', header: 'Dipesan', className: 'text-right', render: (row) => row.quantity },
    ...(showReceiveColumns
      ? ([
          {
            key: 'received',
            header: 'Diterima',
            className: 'text-right',
            render: (row: InvoiceDetail) => row.received_quantity ?? 0,
          },
          {
            key: 'closed',
            header: 'Dibatalkan',
            className: 'text-right',
            render: (row: InvoiceDetail) => ((row.closed_quantity ?? 0) > 0 ? row.closed_quantity : '-'),
          },
        ] as DataTableColumn<InvoiceDetail>[])
      : []),
    { key: 'unit_price', header: 'Harga Satuan', className: 'text-right', render: (row) => formatRupiah(row.unit_price) },
    { key: 'amount', header: 'Jumlah', className: 'text-right', render: (row) => formatRupiah(row.amount) },
  ]

  return (
    <div>
      <Link to="/purchases" className="text-sm text-blue-600 hover:underline print:hidden">
        &larr; Kembali ke daftar purchase
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-900">
            {d.invoice_number}
            <StatusBadge status={stage} />
            <StatusBadge status={d.payment_status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {warehouse?.data.code} — {warehouse?.data.name}
            {contact && <> &middot; {contact.data.name}</>} &middot; {formatDate(d.invoice_date)}
            {d.due_date && <> &middot; Jatuh tempo {formatDate(d.due_date)}</>}
          </p>
          {d.supplier_invoice_number && (
            <p className="mt-1 text-sm text-slate-500">No. invoice supplier: {d.supplier_invoice_number}</p>
          )}
          {(d.receipts ?? []).length > 0 && (
            <p className="mt-1 text-sm">
              Penerimaan stok:{' '}
              {(d.receipts ?? []).map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ', '}
                  <Link to={`/inbounds/${r.inventory_transaction_id}`} className="text-blue-600 hover:underline">
                    Inbound #{r.inventory_transaction_id}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            to={`/purchases/${d.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cetak PDF
          </Link>
          {isDraft && paid === 0 && canWritePurchase && (
            <Link
              to={`/purchases/${d.id}/edit`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </Link>
          )}
          {isDraft && paid === 0 && canWritePurchase && (
            <button
              type="button"
              onClick={() => setActiveDialog('delete')}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Hapus
            </button>
          )}
          {(isDraft || awaiting) && canWritePurchase && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batalkan
            </button>
          )}
          {isDraft && canWritePurchase && (
            <button
              type="button"
              onClick={() => setActiveDialog('submit')}
              disabled={!isFullyPaid}
              title={isFullyPaid ? undefined : 'Lunasi pembayaran dulu sebelum diajukan ke gudang'}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Ajukan ke Gudang
            </button>
          )}
          {canReceive && (
            <button
              type="button"
              onClick={() => setReceiveModalOpen(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Terima Barang
            </button>
          )}
        </div>
      </div>

      {isDraft && !isFullyPaid && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 print:hidden">
          Langkah berikutnya: catat pembayaran ke supplier sampai lunas, lalu ajukan ke gudang tujuan. Stok baru
          bertambah setelah admin gudang tujuan menyetujui penerimaan barang.
        </div>
      )}
      {isDraft && isFullyPaid && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 print:hidden">
          Pembayaran sudah lunas. Ajukan ke gudang tujuan agar admin gudang dapat menyetujui penerimaan barang.
        </div>
      )}
      {awaiting && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 print:hidden">
          {d.receipt_status === 'PARTIALLY_RECEIVED'
            ? 'Sebagian barang sudah diterima. Sisanya menunggu pengganti dari supplier — terima lagi bila sudah datang, atau batalkan sisanya (dana dikembalikan).'
            : 'Menunggu persetujuan penerimaan barang oleh admin gudang tujuan.'}
          {isOwnPurchase && ' Anda yang membuat pembelian ini, jadi persetujuannya harus dari admin lain.'}
        </div>
      )}
      {d.cancel_reason && (
        <p className="mt-4 text-sm text-slate-600">
          Alasan pembatalan / catatan penutupan: <strong>{d.cancel_reason}</strong>
        </p>
      )}

      {refundDue > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 print:hidden">
          <span>
            Supplier perlu mengembalikan dana <strong>{formatRupiah(refundDue)}</strong>.
          </span>
          {canRefundPurchase() && (
            <button
              type="button"
              onClick={() => setRefundModalOpen(true)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Catat Pengembalian Dana
            </button>
          )}
        </div>
      )}

      {d.notes && <p className="mt-4 text-sm text-slate-600">Catatan: {d.notes}</p>}

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">Detail Item</h2>
      <DataTable columns={detailColumns} data={detailRows} getRowKey={(row) => row.id} />

      <div className="ml-auto mt-4 max-w-xs space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span>{formatRupiah(d.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tax</span>
          <span>{formatRupiah(d.tax)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
          <span>Total</span>
          <span>{formatRupiah(d.total_amount)}</span>
        </div>
      </div>

      <SupplierInvoiceCard purchase={d} canEdit={canEditDocument} />

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Pembayaran</h2>
          {d.status !== 'CANCELLED' && remainingBalance > 0 && canRecordPayment && (
            <button
              type="button"
              onClick={() => setPaymentModalOpen(true)}
              className="text-sm font-medium text-blue-600 hover:underline print:hidden"
            >
              + Catat Pembayaran
            </button>
          )}
        </div>
        <DataTable
          columns={[
            { key: 'payment_number', header: 'No. Pembayaran', render: (row) => row.payment_number },
            { key: 'payment_date', header: 'Tanggal', render: (row) => formatDate(row.payment_date) },
            {
              key: 'amount',
              header: 'Uang Dikeluarkan',
              className: 'text-right',
              render: (row) => formatRupiah(row.amount),
            },
            { key: 'payment_method', header: 'Metode', render: (row) => paymentMethodLabel(row.payment_method) },
            { key: 'notes', header: 'Catatan', render: (row) => row.notes ?? '-' },
          ]}
          data={payments?.data ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Belum ada pembayaran."
        />
        <p className="mt-2 text-sm text-slate-500">
          Sisa tagihan: <strong>{formatRupiah(remainingBalance)}</strong>
        </p>
      </div>

      {(d.refunds ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pengembalian Dana dari Supplier</h2>
          <DataTable
            columns={[
              { key: 'refund_number', header: 'No. Pengembalian', render: (row: PurchaseRefund) => row.refund_number },
              { key: 'refund_date', header: 'Tanggal', render: (row: PurchaseRefund) => formatDate(row.refund_date) },
              {
                key: 'amount',
                header: 'Uang Diterima Kembali',
                className: 'text-right',
                render: (row: PurchaseRefund) => formatRupiah(row.amount),
              },
              {
                key: 'refund_method',
                header: 'Metode',
                render: (row: PurchaseRefund) => paymentMethodLabel(row.refund_method),
              },
              { key: 'notes', header: 'Catatan', render: (row: PurchaseRefund) => row.notes ?? '-' },
            ]}
            data={d.refunds ?? []}
            getRowKey={(row) => row.id}
          />
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        Dibuat: {formatTimestamp(d.created_at)}
        {d.created_by != null && <> oleh User #{d.created_by}</>}
        {d.submitted_at && <> &middot; Diajukan: {formatTimestamp(d.submitted_at)}</>}
        {d.completed_at && (
          <>
            {' '}
            &middot; Selesai: {formatTimestamp(d.completed_at)}
            {d.completed_by != null && <> oleh User #{d.completed_by}</>}
          </>
        )}
        {d.cancelled_at && <> &middot; Dibatalkan: {formatTimestamp(d.cancelled_at)}</>}
      </div>

      <ConfirmDialog
        open={activeDialog === 'submit'}
        title="Ajukan ke Gudang"
        description="Pembelian ini akan diajukan ke admin gudang tujuan untuk disetujui penerimaannya. Setelah diajukan, pembelian tidak bisa diedit lagi. Lanjutkan?"
        confirmLabel="Ajukan"
        loading={submitMutation.isPending}
        onConfirm={() => submitMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'delete'}
        title="Hapus Purchase"
        description="Dokumen ini akan dihapus permanen. Lanjutkan?"
        confirmLabel="Hapus"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />

      <PaymentFormModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoiceId={purchaseId}
        remainingBalance={remainingBalance}
        kind="purchase"
      />
      <ReceivePurchaseModal open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} purchase={d} />
      <CancelPurchaseModal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} purchase={d} />
      <PurchaseRefundModal
        open={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        purchaseId={purchaseId}
        refundDue={refundDue}
      />
    </div>
  )
}
