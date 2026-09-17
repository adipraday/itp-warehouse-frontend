import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { useToast } from '../../hooks/useToast'
import { useIdempotencyKey } from '../../hooks/useIdempotencyKey'
import { useDocumentActions, INVOICE_LIFECYCLE } from '../../hooks/useDocumentActions'
import { usePermissions } from '../../auth/permissions'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatTimestamp } from '../../utils/date'
import { formatRupiah, parseMoney } from '../../utils/money'
import { paymentMethodLabel } from '../../types/payment'
import { getWarehouse } from '../../api/warehouses'
import { getContact } from '../../api/contacts'
import { listPayments } from '../../api/payments'
import {
  cancelInvoiceByKind,
  completeInvoiceByKind,
  deleteInvoiceByKind,
  getInvoiceByKind,
  resumeSale,
} from '../../api/invoices'
import type { InvoiceKind } from '../../api/invoices'
import type { InvoiceDetail } from '../../types/invoice'
import { PaymentFormModal } from '../payments/PaymentFormModal'
import { HoldSaleModal } from './HoldSaleModal'
import { SalesReceiptModal } from './SalesReceiptModal'

interface InvoiceDetailPageProps {
  kind: InvoiceKind
  title: string
}

type ActiveDialog = 'complete' | 'cancel' | 'delete' | null

export default function InvoiceDetailPage({ kind, title }: InvoiceDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const invoiceId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { getKey, reset } = useIdempotencyKey()
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [holdModalOpen, setHoldModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const { canWrite } = usePermissions()
  const canWriteResource = canWrite(kind === 'sales' ? 'sales' : 'purchases')
  const canRecordPayment = canWrite('payments')
  const basePath = kind === 'sales' ? '/sales' : '/purchases'
  const linkedTransactionPath = kind === 'sales' ? '/outbounds' : '/inbounds'
  const linkedTransactionLabel = kind === 'sales' ? 'Outbound' : 'Inbound'

  const { data: doc, isLoading } = useQuery({
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

  const { data: payments } = useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: () => listPayments({ invoice_id: invoiceId, per_page: 100 }),
    enabled: doc?.data.status === 'COMPLETED',
  })

  const { can } = useDocumentActions(doc?.data.status ?? '', INVOICE_LIFECYCLE)

  const totalPaid = payments?.data.reduce((sum, p) => sum + parseMoney(p.amount), 0) ?? 0
  const remainingBalance = doc ? parseMoney(doc.data.total_amount) - totalPaid : 0

  const detailColumns: DataTableColumn<InvoiceDetail>[] = [
    { key: 'sku', header: 'SKU', render: (row) => row.sku },
    { key: 'name', header: 'Nama Item', render: (row) => row.name },
    { key: 'quantity', header: 'Qty', className: 'text-right', render: (row) => row.quantity },
    { key: 'unit_price', header: 'Unit Price', className: 'text-right', render: (row) => formatRupiah(row.unit_price) },
    { key: 'amount', header: 'Amount', className: 'text-right', render: (row) => formatRupiah(row.amount) },
    ...(kind === 'sales'
      ? ([
          {
            key: 'unit_cost',
            header: 'Unit Cost (HPP)',
            className: 'text-right',
            render: (row: InvoiceDetail) =>
              doc?.data.status === 'DRAFT' ? (
                <span className="text-slate-400">akan terisi setelah Complete</span>
              ) : (
                formatRupiah(row.unit_cost)
              ),
          },
        ] as DataTableColumn<InvoiceDetail>[])
      : []),
  ]

  function invalidateAfterStockChange() {
    queryClient.invalidateQueries({ queryKey: [kind] })
    queryClient.invalidateQueries({ queryKey: ['stocks'] })
    queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
    queryClient.invalidateQueries({ queryKey: ['cost-layers'] })
    queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
    queryClient.invalidateQueries({ queryKey: [linkedTransactionPath.slice(1)] })
  }

  const completeMutation = useMutation({
    mutationFn: () => completeInvoiceByKind(kind, invoiceId, getKey()),
    onSuccess: () => {
      reset()
      invalidateAfterStockChange()
      toast.show(`${title} berhasil diselesaikan.`, 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelInvoiceByKind(kind, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [kind] })
      toast.show(`${title} dibatalkan.`, 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  // Hold/resume (§22 frontend-integration-guide.md) — SALES-only, sale-nya TETAP DRAFT sesudah
  // resume, cuma `held_at`/`hold_label` yang di-clear. Tidak butuh ConfirmDialog (aksi ringan,
  // dokumen ini sendiri yang bilang "aman di-ignore" kalau double-click — lihat `resumeSale`).
  const resumeMutation = useMutation({
    mutationFn: () => resumeSale(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [kind, invoiceId] })
      queryClient.invalidateQueries({ queryKey: [kind] })
      toast.show('Transaksi dilanjutkan.', 'success')
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoiceByKind(kind, invoiceId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [kind, invoiceId] })
      queryClient.invalidateQueries({ queryKey: [kind] })
      toast.show(`${title} dihapus.`, 'success')
      navigate(basePath)
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
  // Hold/resume (§22) SALES-only — Purchase tidak punya field ini sama sekali di response.
  const isHeld = kind === 'sales' && !!d.held_at

  return (
    <div>
      <Link to={basePath} className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar {title.toLowerCase()}
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-900">
            {d.invoice_number}
            <StatusBadge status={d.status} />
            <StatusBadge status={d.payment_status} />
            {isHeld && <StatusBadge status="DITAHAN" />}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {warehouse?.data.code} — {warehouse?.data.name}
            {contact && <> &middot; {contact.data.name}</>}
            {' '}&middot; {formatDate(d.invoice_date)}
            {d.due_date && <> &middot; Jatuh tempo {formatDate(d.due_date)}</>}
          </p>
          {isHeld && (
            <p className="mt-1 text-sm text-amber-600">
              Ditahan{d.hold_label && <> — {d.hold_label}</>}
            </p>
          )}
          {d.inventory_transaction_id && (
            <p className="mt-1 text-sm">
              Transaksi terkait:{' '}
              <Link
                to={`${linkedTransactionPath}/${d.inventory_transaction_id}`}
                className="text-blue-600 hover:underline"
              >
                {linkedTransactionLabel} #{d.inventory_transaction_id}
              </Link>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            to={`${basePath}/${d.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cetak PDF
          </Link>
          {/* Cetak struk (§19) SALES-only, cuma buat sale COMPLETED — backend nolak 409
              INVALID_STATUS kalau masih DRAFT. */}
          {kind === 'sales' && d.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={() => setReceiptModalOpen(true)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cetak Struk
            </button>
          )}
          {can('edit') && canWriteResource && (
            <Link
              to={`${basePath}/${d.id}/edit`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </Link>
          )}
          {can('delete') && canWriteResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('delete')}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Hapus
            </button>
          )}
          {can('cancel') && canWriteResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('cancel')}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batalkan
            </button>
          )}
          {/* Hold/resume (§22) SALES-only, DRAFT-only — sale-nya sendiri tidak berubah status. */}
          {kind === 'sales' && d.status === 'DRAFT' && canWriteResource && !isHeld && (
            <button
              type="button"
              onClick={() => setHoldModalOpen(true)}
              className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              Tahan
            </button>
          )}
          {kind === 'sales' && d.status === 'DRAFT' && canWriteResource && isHeld && (
            <button
              type="button"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              {resumeMutation.isPending ? 'Memproses...' : 'Lanjutkan'}
            </button>
          )}
          {can('complete') && canWriteResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('complete')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Complete
            </button>
          )}
        </div>
      </div>

      {d.reversal_of_invoice_id && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Dokumen reversal dari invoice #{d.reversal_of_invoice_id}. Alasan: {d.reversal_reason}
        </div>
      )}

      {d.notes && <p className="mt-4 text-sm text-slate-600">Catatan: {d.notes}</p>}

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">Detail Item</h2>
      <DataTable columns={detailColumns} data={d.details ?? []} getRowKey={(row) => row.id} />

      <div className="ml-auto mt-4 max-w-xs space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span>{formatRupiah(d.subtotal)}</span>
        </div>
        {parseMoney(d.discount_amount) > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Diskon</span>
            <span>-{formatRupiah(d.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Tax</span>
          <span>{formatRupiah(d.tax)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
          <span>Total</span>
          <span>{formatRupiah(d.total_amount)}</span>
        </div>
      </div>

      {d.status === 'COMPLETED' && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Pembayaran</h2>
            {d.payment_status !== 'PAID' && canRecordPayment && (
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                + Catat Pembayaran
              </button>
            )}
          </div>
          <DataTable
            columns={[
              { key: 'payment_number', header: 'No. Pembayaran', render: (row) => row.payment_number },
              { key: 'payment_date', header: 'Tanggal', render: (row) => formatDate(row.payment_date) },
              { key: 'amount', header: 'Jumlah', className: 'text-right', render: (row) => formatRupiah(row.amount) },
              { key: 'payment_method', header: 'Metode', render: (row) => paymentMethodLabel(row.payment_method) },
              {
                key: 'change_amount',
                header: 'Kembalian',
                className: 'text-right',
                render: (row) => (parseMoney(row.change_amount) > 0 ? formatRupiah(row.change_amount) : '-'),
              },
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
      )}

      <div className="mt-4 text-xs text-slate-400">
        Dibuat: {formatTimestamp(d.created_at)}
        {d.created_by != null && <> oleh User #{d.created_by}</>}
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
        open={activeDialog === 'complete'}
        title={`Complete ${title}`}
        description={`Aksi ini akan membuat & menyelesaikan transaksi ${linkedTransactionLabel} terkait, mengubah stok secara permanen, dan tidak bisa dibatalkan. Lanjutkan?`}
        confirmLabel="Complete"
        loading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'cancel'}
        title={`Batalkan ${title}`}
        description="Dokumen DRAFT ini akan dibatalkan. Lanjutkan?"
        confirmLabel="Batalkan"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'delete'}
        title={`Hapus ${title}`}
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
        invoiceId={invoiceId}
        remainingBalance={remainingBalance}
      />

      {kind === 'sales' && (
        <>
          <HoldSaleModal open={holdModalOpen} onClose={() => setHoldModalOpen(false)} saleId={invoiceId} />
          <SalesReceiptModal
            open={receiptModalOpen}
            onClose={() => setReceiptModalOpen(false)}
            saleId={invoiceId}
          />
        </>
      )}
    </div>
  )
}
