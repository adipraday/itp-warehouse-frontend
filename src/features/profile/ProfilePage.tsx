import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { TextField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { getMe, updateMe, changeMyPassword } from '../../api/users'
import { useAuth } from '../../auth/useAuth'
import * as authStore from '../../auth/authStore'

const PASSWORD_RULE_HINT = 'Minimal 8 karakter, kombinasi huruf besar, huruf kecil, dan angka.'

function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 72) return 'Password harus 8–72 karakter.'
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar.'
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil.'
  if (!/[0-9]/.test(password)) return 'Password harus mengandung angka.'
  return null
}

export default function ProfilePage() {
  const toast = useToast()
  const { user: sessionUser } = useAuth()

  const { data: me, isLoading, isError, error } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: getMe,
  })

  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  useEffect(() => {
    if (me) setProfileForm({ name: me.name, email: me.email })
  }, [me])

  const profileMutation = useMutation({
    mutationFn: () => updateMe({ name: profileForm.name.trim(), email: profileForm.email.trim() }),
    onSuccess: (updated) => {
      authStore.updateUser(updated)
      toast.show('Profil berhasil diupdate.', 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    profileMutation.mutate()
  }

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const passwordMutation = useMutation({
    mutationFn: () =>
      changeMyPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      }),
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm: '' })
      setPasswordSuccess(true)
      toast.show('Password berhasil diubah.', 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPasswordSuccess(false)

    const ruleError = validatePassword(passwordForm.new_password)
    if (ruleError) {
      toast.show(ruleError, 'error')
      return
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      toast.show('Password baru harus beda dari password saat ini.', 'error')
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm) {
      toast.show('Konfirmasi password baru tidak cocok.', 'error')
      return
    }
    passwordMutation.mutate()
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Memuat profil...</p>
  }

  if (isError || !me) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Gagal memuat profil: {getErrorMessage(error)}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Profil Saya</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Data Diri</h2>
        <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
          <TextField
            label="Nama"
            required
            maxLength={150}
            value={profileForm.name}
            onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Email"
            type="email"
            required
            value={profileForm.email}
            onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
          />

          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-400">Role</p>
              <p className="text-sm font-medium text-slate-700">{me.role}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Business Unit</p>
              <p className="text-sm font-medium text-slate-700">{me.bu_name ?? '— (semua BU)'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Status</p>
              <p className="text-sm font-medium text-slate-700">{me.status}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {profileMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Ganti Password</h2>
        <p className="mt-1 text-xs text-slate-400">{PASSWORD_RULE_HINT}</p>

        {passwordSuccess && (
          <p className="mt-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-700">
            Password berhasil diubah. Sesi/perangkat lain yang sedang login otomatis ter-logout. Tab
            ini tetap aktif sampai sesi saat ini berakhir dengan sendirinya (maks. 15 menit) — ini
            perilaku normal, bukan bug.
          </p>
        )}

        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
          <TextField
            label="Password Saat Ini"
            type="password"
            required
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))}
          />
          <TextField
            label="Password Baru"
            type="password"
            required
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))}
          />
          <TextField
            label="Konfirmasi Password Baru"
            type="password"
            required
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {passwordMutation.isPending ? 'Menyimpan...' : 'Ganti Password'}
            </button>
          </div>
        </form>
      </section>

      {sessionUser && sessionUser.id !== me.id && (
        // Guard murni jaga-jaga — /users/me seharusnya selalu identitas sendiri, tapi kalau
        // suatu saat backend/response berubah, jangan sampai UI diam-diam salah tampil.
        <p className="text-xs text-amber-600">Data yang ditampilkan mungkin tidak sinkron dengan sesi Anda.</p>
      )}
    </div>
  )
}
