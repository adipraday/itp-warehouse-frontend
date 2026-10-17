import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { DifferenceBadge } from '../../components/DifferenceBadge'
import { useToast } from '../../hooks/useToast'
import { useIdempotencyKey } from '../../hooks/useIdempotencyKey'
import { useDocumentActions, STOCK_OPNAME_LIFECYCLE } from '../../hooks/useDocumentActions'
import { usePermissions } from '../../auth/permissions'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatTimestamp } from '../../utils/date'
import { formatNumber } from '../../utils/money'
import { getWarehouse } from '../../api/warehouses'
import {
  approveStockOpname,
  cancelStockOpname,
  deleteStockOpname,
  getStockOpname,
  submitStockOpname,
} from '../../api/stockOpnames'
import type { StockOpnameDetail } from '../../types/stockOpname'
import { useI18n } from '../../i18n/useI18n'
import { tk } from '../../i18n/i18n'

const detailColumns: DataTableColumn<StockOpnameDetail>[] = [
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'name', header: tk('Nama Item'), render: (row) => row.name },
  { key: 'system_qty', header: tk('Qty Sistem'), className: 'text-right', render: (row) => formatNumber(row.system_qty) },
  {
    key: 'physical_qty',
    header: tk('Qty Fisik'),
    className: 'text-right',
    render: (row) => formatNumber(row.physical_qty),
  },
  { key: 'difference', header: tk('Selisih'), render: (row) => <DifferenceBadge value={row.difference} /> },
  { key: 'notes', header: tk('Catatan'), render: (row) => row.notes ?? '-' },
]

type ActiveDialog = 'submit' | 'approve' | 'cancel' | 'delete' | null

export default function StockOpnameDetailPage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const opnameId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { getKey, reset } = useIdempotencyKey()
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const { canWrite, canApprove, canSubmit } = usePermissions()
  const canWriteResource = canWrite('stock-opnames')
  const canApproveResource = canApprove('stock-opnames')
  const canSubmitResource = canSubmit('stock-opnames')

  const { data: doc, isLoading } = useQuery({
    queryKey: ['stock-opnames', opnameId],
    queryFn: () => getStockOpname(opnameId),
  })

  const { data: warehouse } = useQuery({
    queryKey: ['warehouses', doc?.data.warehouse_id],
    queryFn: () => getWarehouse(doc?.data.warehouse_id as number),
    enabled: !!doc?.data.warehouse_id,
  })

  const { can } = useDocumentActions(doc?.data.status ?? '', STOCK_OPNAME_LIFECYCLE)

  function invalidateAfterStockChange() {
    queryClient.invalidateQueries({ queryKey: ['stock-opnames'] })
    queryClient.invalidateQueries({ queryKey: ['stocks'] })
    queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
    queryClient.invalidateQueries({ queryKey: ['cost-layers'] })
    queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
  }

  const submitMutation = useMutation({
    mutationFn: () => submitStockOpname(opnameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opnames'] })
      toast.show(t('Stock opname disubmit.'), 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => approveStockOpname(opnameId, getKey()),
    onSuccess: () => {
      reset()
      invalidateAfterStockChange()
      toast.show(t('Stock opname disetujui, selisih sudah diposting ke ledger.'), 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelStockOpname(opnameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opnames'] })
      toast.show(t('Stock opname dibatalkan.'), 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteStockOpname(opnameId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['stock-opnames', opnameId] })
      queryClient.invalidateQueries({ queryKey: ['stock-opnames'] })
      toast.show(t('Stock opname dihapus.'), 'success')
      navigate('/stock-opnames')
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

  return (
    <div>
      <Link to="/stock-opnames" className="text-sm text-blue-600 hover:underline">
        {t('← Kembali ke daftar stock opname')}
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-900">
            {d.opname_number}
            <StatusBadge status={d.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {warehouse?.data.code} — {warehouse?.data.name} &middot; {formatDate(d.opname_date)}
          </p>
        </div>

        <div className="flex gap-2">
          {can('edit') && canWriteResource && (
            <Link
              to={`/stock-opnames/${d.id}/edit`}
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
          {can('submit') && canSubmitResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('submit')}
              className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              {t('Submit')}
            </button>
          )}
          {can('approve') && canApproveResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('approve')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('Approve')}
            </button>
          )}
        </div>
      </div>

      {d.reversal_of_stock_opname_id && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('Dokumen reversal dari opname #')}{d.reversal_of_stock_opname_id}{t('. Alasan:')} {d.reversal_reason}
        </div>
      )}

      {d.notes && <p className="mt-4 text-sm text-slate-600">{t('Catatan:')} {d.notes}</p>}

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">{t('Detail Item')}</h2>
      <DataTable columns={detailColumns} data={d.details ?? []} getRowKey={(row) => row.id} />

      <div className="mt-4 text-xs text-slate-400">
        {t('Dibuat:')} {formatTimestamp(d.created_at)}
        {d.created_by != null && <> {t('oleh User #')}{d.created_by}</>}
        {d.submitted_at && <> {t('· Disubmit:')} {formatTimestamp(d.submitted_at)}</>}
        {d.approved_at && (
          <>
            {' '}
            {t('· Disetujui:')} {formatTimestamp(d.approved_at)}
            {d.approved_by != null && <> {t('oleh User #')}{d.approved_by}</>}
          </>
        )}
        {d.cancelled_at && <> {t('· Dibatalkan:')} {formatTimestamp(d.cancelled_at)}</>}
      </div>

      <ConfirmDialog
        open={activeDialog === 'submit'}
        title={t('Submit Stock Opname')}
        description={t('Dokumen akan berpindah status ke SUBMITTED, siap direview untuk approval. Lanjutkan?')}
        confirmLabel={t('Submit')}
        loading={submitMutation.isPending}
        onConfirm={() => submitMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'approve'}
        title={t('Approve Stock Opname')}
        description={t('Selisih akan langsung diposting sebagai ADJUSTMENT ke ledger stok secara permanen dan tidak bisa dibatalkan. Lanjutkan?')}
        confirmLabel={t('Approve')}
        loading={approveMutation.isPending}
        onConfirm={() => approveMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'cancel'}
        title={t('Batalkan Stock Opname')}
        description={t('Dokumen ini akan dibatalkan. Lanjutkan?')}
        confirmLabel={t('Batalkan')}
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'delete'}
        title={t('Hapus Stock Opname')}
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
