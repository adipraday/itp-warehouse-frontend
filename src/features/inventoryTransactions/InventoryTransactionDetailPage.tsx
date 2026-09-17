import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { useToast } from '../../hooks/useToast'
import { useIdempotencyKey } from '../../hooks/useIdempotencyKey'
import { useDocumentActions, INVENTORY_TRANSACTION_LIFECYCLE } from '../../hooks/useDocumentActions'
import { usePermissions } from '../../auth/permissions'
import { getErrorMessage } from '../../api/errors'
import { formatDate, formatTimestamp } from '../../utils/date'
import { formatRupiah } from '../../utils/money'
import { getWarehouse } from '../../api/warehouses'
import { getContact } from '../../api/contacts'
import {
  cancelInventoryTransaction,
  completeInventoryTransaction,
  deleteInventoryTransaction,
  getInventoryTransaction,
} from '../../api/inventoryTransactions'
import type { InventoryTransactionKind } from '../../api/inventoryTransactions'
import type { InventoryTransactionDetail } from '../../types/inventoryTransaction'

const detailColumns: DataTableColumn<InventoryTransactionDetail>[] = [
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'name', header: 'Nama Item', render: (row) => row.name },
  { key: 'quantity', header: 'Qty', className: 'text-right', render: (row) => row.quantity },
  { key: 'unit_price', header: 'Unit Price', className: 'text-right', render: (row) => formatRupiah(row.unit_price) },
  { key: 'total_price', header: 'Total', className: 'text-right', render: (row) => formatRupiah(row.total_price) },
]

interface InventoryTransactionDetailPageProps {
  kind: InventoryTransactionKind
  title: string
}

type ActiveDialog = 'complete' | 'cancel' | 'delete' | null

export default function InventoryTransactionDetailPage({ kind, title }: InventoryTransactionDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const transactionId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { getKey, reset } = useIdempotencyKey()
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const basePath = kind === 'inbound' ? '/inbounds' : '/outbounds'
  const listQueryKey = kind === 'inbound' ? 'inbounds' : 'outbounds'
  const { canWrite } = usePermissions()
  const canWriteResource = canWrite(kind === 'inbound' ? 'inbounds' : 'outbounds')

  const { data: doc, isLoading } = useQuery({
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

  const { can } = useDocumentActions(doc?.data.status ?? '', INVENTORY_TRANSACTION_LIFECYCLE)

  function invalidateAfterStockChange() {
    queryClient.invalidateQueries({ queryKey: [listQueryKey] })
    queryClient.invalidateQueries({ queryKey: ['stocks'] })
    queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
    queryClient.invalidateQueries({ queryKey: ['cost-layers'] })
    queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
  }

  const completeMutation = useMutation({
    mutationFn: () => completeInventoryTransaction(kind, transactionId, getKey()),
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
    mutationFn: () => cancelInventoryTransaction(kind, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listQueryKey] })
      toast.show(`${title} dibatalkan.`, 'success')
      setActiveDialog(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setActiveDialog(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInventoryTransaction(kind, transactionId),
    onSuccess: () => {
      // Evict cache entry dokumen yang baru dihapus. Catatan: karena halaman ini masih
      // ter-mount saat callback ini jalan, query observer-nya tetap sempat refetch sekali
      // (404, harmless — lihat progress-log.md) sebelum navigate() di bawah unmount halaman.
      queryClient.removeQueries({ queryKey: [listQueryKey, transactionId] })
      queryClient.invalidateQueries({ queryKey: [listQueryKey] })
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

  return (
    <div>
      <Link to={basePath} className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar {title.toLowerCase()}
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-900">
            {d.transaction_number}
            <StatusBadge status={d.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {warehouse?.data.code} — {warehouse?.data.name} &middot; {formatDate(d.transaction_date)}
            {contact && <> &middot; {contact.data.name}</>}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to={`${basePath}/${d.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cetak Surat Jalan
          </Link>
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

      {d.reversal_of_transaction_id && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Dokumen reversal dari transaksi #{d.reversal_of_transaction_id}. Alasan: {d.reversal_reason}
        </div>
      )}

      {d.notes && <p className="mt-4 text-sm text-slate-600">Catatan: {d.notes}</p>}

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">Detail Item</h2>
      <DataTable columns={detailColumns} data={d.details ?? []} getRowKey={(row) => row.id} />

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
        description={`Aksi ini akan ${kind === 'inbound' ? 'menambah' : 'mengurangi'} stok secara permanen dan tidak bisa dibatalkan. Lanjutkan?`}
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
    </div>
  )
}
