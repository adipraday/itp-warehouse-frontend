import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { TextField } from '../../components/FormField'
import { StatusBadge } from '../../components/StatusBadge'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { listUsers, sendPasswordReset } from '../../api/users'
import type { AuthUser } from '../../auth/authApi'
import { UserFormModal } from './UserFormModal'
import { UserSessionsModal } from './UserSessionsModal'

export default function UserListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AuthUser | null>(null)
  const [sessionsFor, setSessionsFor] = useState<AuthUser | null>(null)
  const toast = useToast()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', debouncedSearch, page],
    queryFn: () => listUsers({ page, search: debouncedSearch.trim() || undefined }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => sendPasswordReset(id),
    onSuccess: (result) => {
      toast.show(
        result.set_password_token
          ? `Link aktivasi terkirim. Token (dev-only): ${result.set_password_token}`
          : 'Link set-password telah dikirim ke email user.',
        'success',
      )
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const columns: DataTableColumn<AuthUser>[] = [
    { key: 'name', header: 'Nama', render: (row) => row.name },
    { key: 'email', header: 'Email', render: (row) => row.email },
    { key: 'role', header: 'Role', render: (row) => row.role },
    { key: 'bu_name', header: 'Business Unit', render: (row) => row.bu_name ?? '— (semua BU)' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => resetPasswordMutation.mutate(row.id)}
            disabled={resetPasswordMutation.isPending}
            className="text-sm font-medium text-slate-600 hover:underline disabled:opacity-50"
          >
            Reset Password
          </button>
          <button
            type="button"
            onClick={() => setSessionsFor(row)}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            Sesi
          </button>
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
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah User
        </button>
      </div>

      <div className="mb-4 max-w-sm">
        <TextField
          label="Cari nama / email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Ketik untuk mencari..."
        />
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.users ?? []}
            getRowKey={(row) => row.id}
            loading={isLoading}
            emptyMessage="Belum ada user."
          />
          {data?.pagination && <Pagination meta={data.pagination} onPageChange={setPage} />}
        </>
      )}

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editing} />
      <UserSessionsModal open={!!sessionsFor} onClose={() => setSessionsFor(null)} user={sessionsFor} />
    </div>
  )
}
