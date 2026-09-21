import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { SelectField } from '../../components/FormField'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { listAssignments, createAssignment, deleteAssignment } from '../../api/userWarehouseAssignments'
import { listUsers } from '../../api/users'
import { STAFF_ROLES } from '../../auth/permissions'
import type { Role } from '../../auth/permissions'
import type { WarehouseAssignment } from '../../types/warehouseAssignment'

export default function WarehouseAssignmentsPage() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [removing, setRemoving] = useState<WarehouseAssignment | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: assignments, isLoading, isError, error } = useQuery({
    queryKey: ['user-warehouse-assignments', warehouseId],
    queryFn: () => listAssignments({ warehouse_id: warehouseId as number }),
    enabled: warehouseId !== null,
  })

  // Semua user BU ini (per_page besar biar dapat semuanya sekaligus, sama pola kayak
  // WarehouseSelect/ContactSelect) — dipakai buat resolve nama di baris assignment DAN buat
  // opsi dropdown "+ Assign" (staff-gudang/kasir-sales/purchasing/finance saja; admin-bu/owner/
  // super-admin tidak pernah kena fitur ini, §17 frontend-integration-guide.md).
  const { data: userList } = useQuery({
    queryKey: ['users', 'all-staff'],
    queryFn: () => listUsers({ per_page: 100 }),
  })
  const staffUsers = (userList?.users ?? []).filter((u) => STAFF_ROLES.includes(u.role as Role))
  const assignedUserIds = new Set((assignments?.data ?? []).map((a) => a.user_id))
  const eligibleUsers = staffUsers.filter((u) => !assignedUserIds.has(u.id))

  function userLabel(userId: number): string {
    const u = staffUsers.find((x) => x.id === userId)
    return u ? `${u.name} (${u.role})` : `User #${userId}`
  }

  const assignMutation = useMutation({
    mutationFn: () => createAssignment({ user_id: Number(selectedUserId), warehouse_id: warehouseId as number }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-warehouse-assignments', warehouseId] })
      toast.show('Staff berhasil di-assign.', 'success')
      setSelectedUserId('')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-warehouse-assignments', warehouseId] })
      toast.show('Assignment berhasil dicabut.', 'success')
      setRemoving(null)
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
      setRemoving(null)
    },
  })

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Assign Staff ke Warehouse</h1>
      <p className="mt-1 text-sm text-slate-500">
        Batasi admin-warehouse/staff-gudang/kasir-sales/purchasing/finance ke warehouse tertentu —
        berguna kalau BU Anda punya lebih dari satu warehouse (mis. Gudang Pusat + Cabang) dan tiap
        warehouse punya staff (atau kepala cabang) sendiri.
      </p>

      <div className="mt-6 max-w-sm">
        <WarehouseSelect value={warehouseId} onChange={setWarehouseId} placeholder="-- pilih warehouse --" />
      </div>

      {warehouseId === null ? (
        <p className="mt-8 text-sm text-slate-400">Pilih warehouse dulu buat lihat/kelola staff-nya.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Staff Ter-assign</h2>
            {isError ? (
              <ErrorState error={error} />
            ) : isLoading ? (
              <p className="text-sm text-slate-400">Memuat...</p>
            ) : (assignments?.data ?? []).length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
                Belum ada staff ter-assign ke warehouse ini.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {(assignments?.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-slate-700">{userLabel(a.user_id)}</span>
                    <button
                      type="button"
                      onClick={() => setRemoving(a)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Cabut
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">+ Assign Staff Baru</h2>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <SelectField
                label="Pilih staff"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">-- pilih staff --</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.email} ({u.role})
                  </option>
                ))}
              </SelectField>
              {eligibleUsers.length === 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  Semua staff BU ini sudah ter-assign ke warehouse ini, atau belum ada staff sama sekali.
                </p>
              )}
              <button
                type="button"
                onClick={() => assignMutation.mutate()}
                disabled={selectedUserId === '' || assignMutation.isPending}
                className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Menyimpan...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Cabut Assignment"
        description={
          removing ? `Yakin mau cabut akses "${userLabel(removing.user_id)}" dari warehouse ini?` : ''
        }
        confirmLabel="Cabut"
        danger
        loading={removeMutation.isPending}
        onConfirm={() => removing && removeMutation.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
