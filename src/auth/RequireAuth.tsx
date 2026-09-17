import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import * as authStore from './authStore'

export default function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  // Logout eksplisit (tombol Logout) tidak boleh bawa `from` — supaya login berikutnya selalu
  // mendarat di /dashboard, bukan nyasar balik ke halaman sebelum logout. Token expired/refresh
  // gagal (bukan logout eksplisit) tetap bawa `from` seperti biasa, supaya user kembali ke
  // halaman yang sedang dibuka setelah login ulang. Baca flag di sini harus pure (lihat
  // authStore.wasIntentionalLogout()) — reset-nya dilakukan lewat useEffect di bawah, bukan di
  // sini, supaya double-invoke render (StrictMode/dev) tidak bikin baca jadi salah.
  const wasIntentionalLogout = authStore.wasIntentionalLogout()

  useEffect(() => {
    if (status === 'unauthenticated' && wasIntentionalLogout) {
      authStore.resetIntentionalLogout()
    }
  }, [status, wasIntentionalLogout])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Memuat sesi...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    const state = wasIntentionalLogout ? undefined : { from: location }
    return <Navigate to="/login" state={state} replace />
  }

  return <Outlet />
}
