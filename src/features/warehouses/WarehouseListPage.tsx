import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { deleteWarehouse, listWarehouses } from '../../api/warehouses'
import type { Warehouse } from '../../types/warehouse'
import { WarehouseFormModal } from './WarehouseFormModal'
import { usePermissions } from '../../auth/permissions'
import { BuLabel } from '../../components/BuLabel'
import { hasMultipleBuIds } from '../../utils/bu'
import { useI18n } from '../../i18n/useI18n'

export default function WarehouseListPage() {
  const { t } = useI18n()
  const { canWrite } = usePermissions()
  const canManage = canWrite('warehouses')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [deleting, setDeleting] = useState<Warehouse | null>(null)

  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['warehouses', page],
    queryFn: () => listWarehouses({ page }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.show(t('Warehouse berhasil dihapus.'), 'success')
      setDeleting(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setDeleting(null)
    },
  })

  // Kolom "BU" cuma ditampilkan kalau data di halaman ini beneran lintas lebih dari 1 BU —
  // relevan buat admin-bu ber-grant atau owner (§14 frontend-integration-guide.md); user BU
  // tunggal biasa tidak perlu lihat kolom ini sama sekali (semua barisnya toh BU yang sama).
  const showBuColumn = hasMultipleBuIds(data?.data ?? [])

  const columns: DataTableColumn<Warehouse>[] = [
    {
      key: 'code',
      header: t('Kode'),
      render: (row) => (
        <Link to={`/warehouses/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.code}
        </Link>
      ),
    },
    { key: 'name', header: t('Nama'), render: (row) => row.name },
    { key: 'address', header: t('Alamat'), render: (row) => row.address ?? '-' },
    ...(showBuColumn
      ? ([
          {
            key: 'bu',
            header: t('BU'),
            render: (row: Warehouse) => <BuLabel buId={row.bu_id} />,
          },
        ] as DataTableColumn<Warehouse>[])
      : []),
    ...(canManage
      ? ([
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (row: Warehouse) => (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(row)
                    setFormOpen(true)
                  }}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {t('Edit')}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(row)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  {t('Hapus')}
                </button>
              </div>
            ),
          },
        ] as DataTableColumn<Warehouse>[])
      : []),
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t('Warehouses')}</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('+ Tambah Warehouse')}
          </button>
        )}
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            getRowKey={(row) => row.id}
            loading={isLoading}
            emptyMessage={t('Belum ada warehouse.')}
          />
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      <WarehouseFormModal open={formOpen} onClose={() => setFormOpen(false)} warehouse={editing} />

      <ConfirmDialog
        open={!!deleting}
        title={t('Hapus Warehouse')}
        description={t('Yakin mau hapus warehouse "{name}"? Aksi ini tidak bisa dibatalkan.', { name: deleting?.name })}
        confirmLabel={t('Hapus')}
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
