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
import { useI18n } from '../../i18n/useI18n'
import { tk } from '../../i18n/i18n'

const detailColumns: DataTableColumn<InventoryTransactionDetail>[] = [
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'name', header: tk('Nama Item'), render: (row) => row.name },
  { key: 'quantity', header: tk('Qty'), className: 'text-right', render: (row) => row.quantity },
  { key: 'unit_price', header: tk('Unit Price'), className: 'text-right', render: (row) => formatRupiah(row.unit_price) },
  { key: 'total_price', header: tk('Total'), className: 'text-right', render: (row) => formatRupiah(row.total_price) },
]

interface InventoryTransactionDetailPageProps {
  kind: InventoryTransactionKind
  title: string
}

type ActiveDialog = 'complete' | 'cancel' | 'delete' | null

export default function InventoryTransactionDetailPage({ kind, title }: InventoryTransactionDetailPageProps) {
  const { t } = useI18n()
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
      toast.show(t('{title} berhasil diselesaikan.', { title }), 'success')
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
      toast.show(t('{title} dibatalkan.', { title }), 'success')
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
      toast.show(t('{title} dihapus.', { title }), 'success')
      navigate(basePath)
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
      <Link to={basePath} className="text-sm text-blue-600 hover:underline">
        {t('← Kembali ke daftar {title}', { title: title.toLowerCase() })}
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
            {t('Cetak Surat Jalan')}
          </Link>
          {can('edit') && canWriteResource && (
            <Link
              to={`${basePath}/${d.id}/edit`}
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

      {d.reversal_of_transaction_id && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('Dokumen reversal dari transaksi #')}{d.reversal_of_transaction_id}{t('. Alasan:')} {d.reversal_reason}
        </div>
      )}

      {d.notes && <p className="mt-4 text-sm text-slate-600">{t('Catatan:')} {d.notes}</p>}

      <h2 className="mt-6 mb-3 text-sm font-semibold text-slate-700">{t('Detail Item')}</h2>
      <DataTable columns={detailColumns} data={d.details ?? []} getRowKey={(row) => row.id} />

      <div className="mt-4 text-xs text-slate-400">
        {t('Dibuat:')} {formatTimestamp(d.created_at)}
        {d.created_by != null && <> {t('oleh User #')}{d.created_by}</>}
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
        open={activeDialog === 'complete'}
        title={t('Complete {title}', { title })}
        description={
          kind === 'inbound'
            ? t('Aksi ini akan menambah stok secara permanen dan tidak bisa dibatalkan. Lanjutkan?')
            : t('Aksi ini akan mengurangi stok secara permanen dan tidak bisa dibatalkan. Lanjutkan?')
        }
        confirmLabel={t('Complete')}
        loading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'cancel'}
        title={t('Batalkan {title}', { title })}
        description={t('Dokumen DRAFT ini akan dibatalkan. Lanjutkan?')}
        confirmLabel={t('Batalkan')}
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setActiveDialog(null)}
      />
      <ConfirmDialog
        open={activeDialog === 'delete'}
        title={t('Hapus {title}', { title })}
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
