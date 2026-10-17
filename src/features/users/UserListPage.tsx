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
import { useI18n } from '../../i18n/useI18n'
import { translate } from '../../i18n/i18n'

export default function UserListPage() {
  const { t } = useI18n()
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
          ? t('Link aktivasi terkirim. Token (dev-only): {set_password_token}', { set_password_token: result.set_password_token })
          : t('Link set-password telah dikirim ke email user.'),
        'success',
      )
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const columns: DataTableColumn<AuthUser>[] = [
    { key: 'name', header: t('Nama'), render: (row) => row.name },
    { key: 'email', header: t('Email'), render: (row) => row.email },
    { key: 'role', header: t('Role'), render: (row) => row.role },
    { key: 'bu_name', header: t('Business Unit'), render: (row) => row.bu_name ?? translate('— (semua BU)') },
    { key: 'status', header: t('Status'), render: (row) => <StatusBadge status={row.status} /> },
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
            {t('Reset Password')}
          </button>
          <button
            type="button"
            onClick={() => setSessionsFor(row)}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            {t('Sesi')}
          </button>
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
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t('Users')}</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('+ Tambah User')}
        </button>
      </div>

      <div className="mb-4 max-w-sm">
        <TextField
          label={t('Cari nama / email')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder={t('Ketik untuk mencari...')}
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
            emptyMessage={t('Belum ada user.')}
          />
          {data?.pagination && <Pagination meta={data.pagination} onPageChange={setPage} />}
        </>
      )}

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editing} />
      <UserSessionsModal open={!!sessionsFor} onClose={() => setSessionsFor(null)} user={sessionsFor} />
    </div>
  )
}
