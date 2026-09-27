import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TextField } from '../components/FormField'
import { resetPassword, AuthApiError } from '../auth/authApi'
import logoIcon from '../assets/logo-icon.png'

/**
 * §7A auth-backend-requirements.md — konsumsi `?token=` dari link email. Satu endpoint
 * (`POST /auth/reset-password`) dipakai buat 2 kasus (dikonfirmasi live, 2026-09-27: tidak ada
 * endpoint terpisah buat aktivasi user baru) — link "atur ulang password" (lupa password) DAN
 * link aktivasi user baru (`set_password_token` dari `POST /users`) sama-sama berujung ke sini.
 * Sukses me-revoke semua refresh token lama user itu, jadi TIDAK auto-login — arahkan ke /login.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(token as string, password)
      setDone(true)
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : 'Gagal mengatur ulang password. Coba lagi.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <img src={logoIcon} alt="Warehouse System" className="h-20 w-20 object-contain" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">Atur Ulang Password</h1>
        </div>

        {!token ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              Link tidak valid — token tidak ditemukan. Minta link baru lewat halaman lupa
              password.
            </p>
            <Link
              to="/forgot-password"
              className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              Minta Link Baru
            </Link>
          </div>
        ) : done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
              Password berhasil diatur ulang. Semua sesi lama sudah keluar otomatis — silakan
              login pakai password baru.
            </p>
            <Link
              to="/login"
              className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              Ke Halaman Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <TextField
              label="Password Baru"
              type="password"
              required
              autoFocus
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              label="Konfirmasi Password Baru"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <p className="text-xs text-slate-400">Minimal 8 karakter.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
