import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { TextField } from '../components/FormField'
import { useAuth } from '../auth/useAuth'
import { AuthApiError } from '../auth/authApi'
import logoIcon from '../assets/logo-icon.png'
import { useI18n } from '../i18n/useI18n'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { translate } from '../i18n/i18n'

interface LocationState {
  from?: { pathname?: string }
}

export default function LoginPage() {
  const { t } = useI18n()
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    const redirectTo = (location.state as LocationState | null)?.from?.pathname || '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : translate('Login gagal. Periksa email dan password.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="fixed right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <img src={logoIcon} alt={t('Warehouse System')} className="h-20 w-20 object-contain" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">{t('Warehouse System')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('Masuk untuk melanjutkan.')}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            label={t('Email')}
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label={t('Password')}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? t('Masuk...') : t('Masuk')}
          </button>
          <Link to="/forgot-password" className="block text-center text-sm text-blue-600 hover:underline">
            {t('Lupa password?')}
          </Link>
        </form>
      </div>
    </div>
  )
}
