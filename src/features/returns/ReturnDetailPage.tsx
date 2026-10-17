import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { useToast } from '../../hooks/useToast'
import { useIdempotencyKey } from '../../hooks/useIdempotencyKey'
import { useDocumentActions, RETURN_LIFECYCLE } from '../../hooks/useDocumentActions'
import { usePermissions } from '../../auth/permissions'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatTimestamp } from '../../utils/date'
import { formatRupiah } from '../../utils/money'
import { getWarehouse } from '../../api/warehouses'
import { getContact } from '../../api/contacts'
import {
  approveReturn,
  cancelReturn,
  completeReturn,
  deleteReturn,
  getReturn,
  rejectReturn,
} from '../../api/returns'
import type { ReturnDetail } from '../../types/return'
import { useI18n } from '../../i18n/useI18n'
import { tk, translate } from '../../i18n/i18n'

const CONDITION_LABEL: Record<string, string> = { GOOD: tk('Baik'), DAMAGED: tk('Rusak') }
const ACTION_LABEL: Record<string, string> = {
  RESTOCK: tk('Masuk stok lagi'),
  REPLACE: tk('Ganti barang baru'),
  SCRAP: tk('Musnahkan (scrap)'),
}

const detailColumns: DataTableColumn<ReturnDetail>[] = [
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'name', header: tk('Nama Item'), render: (row) => row.name },
  { key: 'quantity', header: tk('Qty'), className: 'text-right', render: (row) => row.quantity },
  { key: 'condition', header: tk('Kondisi'), render: (row) => translate(CONDITION_LABEL[row.condition]) },
  { key: 'action', header: tk('Aksi'), render: (row) => translate(ACTION_LABEL[row.action]) },
  { key: 'unit_cost', header: tk('Unit Cost'), className: 'text-right', render: (row) => formatRupiah(row.unit_cost) },
  { key: 'total_cost', header: tk('Total Cost'), className: 'text-right', render: (row) => formatRupiah(row.total_cost) },
]

type ActiveDialog = 'approve' | 'complete' | 'reject' | 'cancel' | 'delete' | null

export default function ReturnDetailPage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const returnId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { getKey, reset } = useIdempotencyKey()
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const { canWrite, canApprove } = usePermissions()
  const canWriteResource = canWrite('returns')
  const canApproveResource = canApprove('returns')

  const { data: doc, isLoading } = useQuery({
    queryKey: ['returns', returnId],
    queryFn: () => getReturn(returnId),
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

  const { can } = useDocumentActions(doc?.data.status ?? '', RETURN_LIFECYCLE)

  function invalidateAfterStockChange() {
    queryClient.invalidateQueries({ queryKey: ['returns'] })
    queryClient.invalidateQueries({ queryKey: ['stocks'] })
    queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
    queryClient.invalidateQueries({ queryKey: ['cost-layers'] })
    queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
    queryClient.invalidateQueries({ queryKey: ['outbounds'] })
  }

  const approveMutation = useMutation({
    mutationFn: () => approveReturn(returnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      toast.show(t('Retur disetujui.'), 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => completeReturn(returnId, getKey()),
    onSuccess: () => {
      reset()
      invalidateAfterStockChange()
      toast.show(t('Retur berhasil diselesaikan.'), 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => rejectReturn(returnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      toast.show(t('Retur ditolak.'), 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelReturn(returnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      toast.show(t('Retur dibatalkan.'), 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteReturn(returnId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['returns', returnId] })
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      toast.show(t('Retur dihapus.'), 'success')
      navigate('/returns')
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  if (isLoading || !doc) {
    return <p className="text-sm text-slate-400">{t('Memuat data...')}</p>
  }

  const d = doc.data
  const originPath = d.type === 'RETURN_CUSTOMER' ? '/sales' : '/inbounds'
  const originId = d.original_invoice_id ?? d.original_inventory_transaction_id

  return (
    <div>
      <Link to="/returns" className="text-sm text-blue-600 hover:underline">
        {t('← Kembali ke daftar retur')}
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-900">
            {d.return_number}
            <StatusBadge status={d.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.type === 'RETURN_CUSTOMER' ? t('Retur dari Customer') : t('Retur ke Supplier')} &middot;{' '}
            {warehouse?.data.code} — {warehouse?.data.name}
            {contact && <> &middot; {contact.data.name}</>} &middot; {formatDate(d.return_date)}
          </p>
          {originId && (
            <p className="mt-1 text-sm">
              {t('Dokumen asal:')}{' '}
              <Link to={`${originPath}/${originId}`} className="text-blue-600 hover:underline">
                #{originId}
              </Link>
            </p>
          )}
          {d.replacement_inventory_transaction_id && (
            <p className="mt-1 text-sm">
              {t('Outbound pengganti:')}{' '}
              <Link to={`/outbounds/${d.replacement_inventory_transaction_id}`} className="text-blue-600 hover:underline">
                #{d.replacement_inventory_transaction_id}
              </Link>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {can('edit') && canWriteResource && (
            <Link
              to={`/returns/${d.id}/edit`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('Edit')}
            </Link>
          )}
          {can('delete') && canWriteResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('delete')}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {t('Hapus')}
            </button>
          )}
          {can('cancel') && canWriteResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('cancel')}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('Batalkan')}
            </button>
          )}
          {can('reject') && canApproveResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('reject')}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {t('Tolak')}
            </button>
          )}
          {can('approve') && canApproveResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('approve')}
              className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              {t('Approve')}
            </button>
          )}
          {can('complete') && canWriteResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('complete')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('Complete')}
            </button>
          )}
        </div>
      </div>

      {d.reason && <p className="mt-4 text-sm text-slate-600">{t('Alasan:')} {d.reason}</p>}

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">{t('Detail Item')}</h2>
      <DataTable columns={detailColumns} data={d.details ?? []} getRowKey={(row) => row.id} />

      <div className="mt-4 text-xs text-slate-400">
        {t('Dibuat:')} {formatTimestamp(d.created_at)}
        {d.created_by != null && <> {t('oleh User #')}{d.created_by}</>}
        {d.approved_at && (
          <>
            {' '}
            {t('· Disetujui:')} {formatTimestamp(d.approved_at)}
            {d.approved_by != null && <> {t('oleh User #')}{d.approved_by}</>}
          </>
        )}
        {d.completed_at && (
          <>
            {' '}
            {t('· Selesai:')} {formatTimestamp(d.completed_at)}
            {d.completed_by != null && <> {t('oleh User #')}{d.completed_by}</>}
          </>
        )}
        {d.cancelled_at && <> {t('· Dibatalkan:')} {formatTimestamp(d.cancelled_at)}</>}
      </div>

      <ConfirmDialog
        open={activeDialog === 'approve'}
        title={t('Approve Retur')}
        description={t('Dokumen akan berpindah status ke APPROVED. Lanjutkan?')}
        confirmLabel={t('Approve')}
        loading={approveMutation.isPending}
        onConfirm={() => approveMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'complete'}
        title={t('Complete Retur')}
        description={t('Aksi ini akan mengubah stok secara permanen sesuai kondisi & aksi tiap item (termasuk membuat outbound pengganti kalau ada baris REPLACE), dan tidak bisa dibatalkan. Lanjutkan?')}
        confirmLabel={t('Complete')}
        loading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'reject'}
        title={t('Tolak Retur')}
        description={t('Dokumen ini akan ditolak dan tidak akan diproses lebih lanjut. Lanjutkan?')}
        confirmLabel={t('Tolak')}
        danger
        loading={rejectMutation.isPending}
        onConfirm={() => rejectMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'cancel'}
        title={t('Batalkan Retur')}
        description={t('Dokumen ini akan dibatalkan. Lanjutkan?')}
        confirmLabel={t('Batalkan')}
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'delete'}
        title={t('Hapus Retur')}
        description={t('Dokumen ini akan dihapus permanen. Lanjutkan?')}
        confirmLabel={t('Hapus')}
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
    </div>
  )
}
