import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TextField } from '../components/FormField'
import { forgotPassword, AuthApiError } from '../auth/authApi'
import logoIcon from '../assets/logo-icon.png'

/**
 * §7A auth-backend-requirements.md — response `POST /auth/forgot-password` SELALU sama (sukses)
 * baik email terdaftar atau tidak, sengaja mencegah account enumeration. Jadi begitu request
 * selesai tanpa error jaringan, langsung tampilkan pesan generik "kalau terdaftar, link
 * terkirim" — TIDAK ada cabang "email tidak ditemukan" di UI ini, itu bukan bug.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Gagal mengirim link reset. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <img src={logoIcon} alt="Warehouse System" className="h-20 w-20 object-contain" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">Lupa Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masukkan email akun Anda, kami kirimkan link buat atur ulang password.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
              Kalau email itu terdaftar, link atur ulang password sudah dikirim. Cek inbox (dan
              folder spam) Anda.
            </p>
            <Link
              to="/login"
              className="block w-full rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <TextField
              label="Email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
            <Link to="/login" className="block text-center text-sm text-blue-600 hover:underline">
              Kembali ke Login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
