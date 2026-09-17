import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { SelectField, TextField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { createUser, updateUser } from '../../api/users'
import { listAssignableRoles } from '../../api/roles'
import { useAuth } from '../../auth/useAuth'
import type { AuthUser } from '../../auth/authApi'

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  user?: AuthUser | null
}

const EMPTY_FORM = { name: '', email: '', role: '', bu_id: '' as number | '', status: 'ACTIVE' }

export function UserFormModal({ open, onClose, user }: UserFormModalProps) {
  const { user: sessionUser } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [activation, setActivation] = useState<{ token?: string } | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: listAssignableRoles,
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      setActivation(null)
      setForm(
        user
          ? { name: user.name, email: user.email, role: user.role, bu_id: user.bu_id ?? '', status: user.status }
          : EMPTY_FORM,
      )
    }
  }, [open, user])

  const selectedRole = roles?.find((r) => r.name === form.role)
  const isAdminBu = sessionUser?.role === 'admin-bu'
  // requires_bu dari GET /roles menentukan field BU perlu ditampilkan sama sekali atau tidak —
  // untuk admin-bu field ini selalu terkunci ke BU sendiri & disembunyikan dari form (§13.2 poin 3).
  const showBuField = !!selectedRole?.requires_bu && !isAdminBu

  const mutation = useMutation({
    mutationFn: () => {
      const buId = isAdminBu ? (sessionUser?.bu_id ?? null) : selectedRole?.requires_bu ? Number(form.bu_id) || null : null
      if (user) {
        return updateUser(user.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          bu_id: buId,
          status: form.status,
        })
      }
      return createUser({ name: form.name.trim(), email: form.email.trim(), role: form.role, bu_id: buId })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (!user) {
        // Create: tidak ada password di response — backend kirim link set-password ke email.
        // set_password_token cuma ada kalau MAIL_EXPOSE_TOKENS=true di backend (dev-only).
        const token = (result as AuthUser & { set_password_token?: string }).set_password_token
        setActivation({ token })
        toast.show('User berhasil dibuat. Link aktivasi telah dikirim ke email.', 'success')
      } else {
        toast.show('User berhasil diupdate.', 'success')
        onClose()
      }
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Edit User' : 'Tambah User'}>
      {activation ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Link aktivasi telah dikirim ke email user baru.</p>
          {activation.token && (
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">
                Token set-password (cuma tampil di mode development):
              </p>
              <code className="mt-1 block break-all text-xs text-slate-700">{activation.token}</code>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Selesai
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Nama"
            required
            maxLength={150}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <SelectField
            label="Role"
            required
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="" disabled>
              Pilih role...
            </option>
            {roles?.map((r) => (
              <option key={r.name} value={r.name} title={r.description}>
                {r.name}
              </option>
            ))}
          </SelectField>

          {showBuField && (
            <TextField
              label="Business Unit ID"
              type="number"
              required
              value={form.bu_id}
              onChange={(e) => setForm((f) => ({ ...f, bu_id: e.target.value === '' ? '' : Number(e.target.value) }))}
              placeholder="Masukkan ID Business Unit"
            />
          )}

          {user && (
            <SelectField
              label="Status"
              required
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">Aktif</option>
              <option value="SUSPENDED">Nonaktif</option>
            </SelectField>
          )}

          {user && (
            <p className="text-xs text-amber-600">
              Mengubah role, status, atau Business Unit akan mengeluarkan user ini dari semua perangkat
              yang sedang login.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
