import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { useToast } from '../../hooks/useToast'
import { useIdempotencyKey } from '../../hooks/useIdempotencyKey'
import { useDocumentActions, STOCK_TRANSFER_LIFECYCLE } from '../../hooks/useDocumentActions'
import { usePermissions } from '../../auth/permissions'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatTimestamp } from '../../utils/date'
import { getWarehouse } from '../../api/warehouses'
import {
  approveStockTransfer,
  cancelStockTransfer,
  completeStockTransfer,
  deleteStockTransfer,
  getStockTransfer,
} from '../../api/stockTransfers'
import type { StockTransferDetail } from '../../types/stockTransfer'

const detailColumns: DataTableColumn<StockTransferDetail>[] = [
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'name', header: 'Nama Item', render: (row) => row.name },
  { key: 'quantity', header: 'Qty', className: 'text-right', render: (row) => row.quantity },
]

type ActiveDialog = 'approve' | 'complete' | 'cancel' | 'delete' | null

export default function StockTransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const transferId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { getKey, reset } = useIdempotencyKey()
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const { canWrite, canApprove } = usePermissions()
  const canWriteResource = canWrite('stock-transfers')
  const canApproveResource = canApprove('stock-transfers')

  const { data: doc, isLoading } = useQuery({
    queryKey: ['stock-transfers', transferId],
    queryFn: () => getStockTransfer(transferId),
  })

  const { data: sourceWarehouse } = useQuery({
    queryKey: ['warehouses', doc?.data.source_warehouse_id],
    queryFn: () => getWarehouse(doc?.data.source_warehouse_id as number),
    enabled: !!doc?.data.source_warehouse_id,
  })

  const { data: destinationWarehouse } = useQuery({
    queryKey: ['warehouses', doc?.data.destination_warehouse_id],
    queryFn: () => getWarehouse(doc?.data.destination_warehouse_id as number),
    enabled: !!doc?.data.destination_warehouse_id,
  })

  const { can } = useDocumentActions(doc?.data.status ?? '', STOCK_TRANSFER_LIFECYCLE)

  function invalidateAfterStockChange() {
    queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
    queryClient.invalidateQueries({ queryKey: ['stocks'] })
    queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
    queryClient.invalidateQueries({ queryKey: ['cost-layers'] })
    queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
  }

  const approveMutation = useMutation({
    mutationFn: () => approveStockTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast.show('Stock transfer disetujui.', 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => completeStockTransfer(transferId, getKey()),
    onSuccess: () => {
      reset()
      invalidateAfterStockChange()
      toast.show('Stock transfer berhasil diselesaikan.', 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelStockTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast.show('Stock transfer dibatalkan.', 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteStockTransfer(transferId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['stock-transfers', transferId] })
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast.show('Stock transfer dihapus.', 'success')
      navigate('/stock-transfers')
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

  return (
    <div>
      <Link to="/stock-transfers" className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar stock transfer
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-900">
            {d.transfer_number}
            <StatusBadge status={d.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {sourceWarehouse?.data.code} — {sourceWarehouse?.data.name} &rarr; {destinationWarehouse?.data.code} —{' '}
            {destinationWarehouse?.data.name} &middot; {formatDate(d.transfer_date)}
          </p>
        </div>

        <div className="flex gap-2">
          {can('edit') && canWriteResource && (
            <Link
              to={`/stock-transfers/${d.id}/edit`}
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
          {can('approve') && canApproveResource && (
            <button
              type="button"
              onClick={() => setActiveDialog('approve')}
              className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Approve
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

      {d.reversal_of_transfer_id && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Dokumen reversal dari transfer #{d.reversal_of_transfer_id}. Alasan: {d.reversal_reason}
        </div>
      )}

      {d.notes && <p className="mt-4 text-sm text-slate-600">Catatan: {d.notes}</p>}

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">Detail Item</h2>
      <DataTable columns={detailColumns} data={d.details ?? []} getRowKey={(row) => row.id} />

      <div className="mt-4 text-xs text-slate-400">
        Dibuat: {formatTimestamp(d.created_at)}
        {d.created_by != null && <> oleh User #{d.created_by}</>}
        {d.approved_at && (
          <>
            {' '}
            &middot; Disetujui: {formatTimestamp(d.approved_at)}
            {d.approved_by != null && <> oleh User #{d.approved_by}</>}
          </>
        )}
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
        open={activeDialog === 'approve'}
        title="Approve Stock Transfer"
        description="Dokumen akan berpindah status ke APPROVED. Lanjutkan?"
        confirmLabel="Approve"
        loading={approveMutation.isPending}
        onConfirm={() => approveMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'complete'}
        title="Complete Stock Transfer"
        description="Aksi ini akan memindahkan stok secara permanen antar gudang dan tidak bisa dibatalkan. Lanjutkan?"
        confirmLabel="Complete"
        loading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'cancel'}
        title="Batalkan Stock Transfer"
        description="Dokumen ini akan dibatalkan. Lanjutkan?"
        confirmLabel="Batalkan"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'delete'}
        title="Hapus Stock Transfer"
        description="Dokumen ini akan dihapus permanen. Lanjutkan?"
        confirmLabel="Hapus"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
    </div>
  )
}
