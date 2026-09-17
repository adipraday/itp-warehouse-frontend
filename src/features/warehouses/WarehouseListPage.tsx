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

export default function WarehouseListPage() {
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
      toast.show('Warehouse berhasil dihapus.', 'success')
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
      header: 'Kode',
      render: (row) => (
        <Link to={`/warehouses/${row.id}`} className="font-medium text-blue-600 hover:underline">
          {row.code}
        </Link>
      ),
    },
    { key: 'name', header: 'Nama', render: (row) => row.name },
    { key: 'address', header: 'Alamat', render: (row) => row.address ?? '-' },
    ...(showBuColumn
      ? ([
          {
            key: 'bu',
            header: 'BU',
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
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(row)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Hapus
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
        <h1 className="text-xl font-semibold text-slate-900">Warehouses</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah Warehouse
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
            emptyMessage="Belum ada warehouse."
          />
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      <WarehouseFormModal open={formOpen} onClose={() => setFormOpen(false)} warehouse={editing} />

      <ConfirmDialog
        open={!!deleting}
        title="Hapus Warehouse"
        description={`Yakin mau hapus warehouse "${deleting?.name}"? Aksi ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
