import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as authStore from './authStore'
import { login as loginApi, logoutRequest } from './authApi'
import { AuthContext } from './authContextDef'
import type { AuthStatus } from './authContextDef'
import type { AuthUser } from './authApi'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(authStore.getUser())
  const [status, setStatus] = useState<AuthStatus>('loading')
  const rehydrated = useRef(false)

  useEffect(() => {
    // Sinkron ulang tiap authStore berubah dari mana pun (login/logout di komponen ini,
    // ATAU force-logout dari interceptor 401 di api/client.ts yang tidak tahu soal React).
    return authStore.subscribe(() => {
      setUser(authStore.getUser())
      setStatus(authStore.getAccessToken() ? 'authenticated' : 'unauthenticated')
    })
  }, [])

  useEffect(() => {
    // Guard run-sekali: StrictMode dev double-invoke useEffect bisa trigger 2x refresh call
    // dengan refresh_token yang sama — refresh token lama langsung invalid setelah dipakai,
    // jadi refresh ganda beneran bisa kena deteksi reuse & semua token user di-revoke backend.
    if (rehydrated.current) return
    rehydrated.current = true

    if (!authStore.getStoredRefreshToken()) {
      setStatus('unauthenticated')
      return
    }
    authStore
      .refreshAccessToken()
      .then(() => setStatus('authenticated'))
      .catch(() => setStatus('unauthenticated'))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginApi(email, password)
    authStore.setSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: session.user,
    })
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    const storedRefreshToken = authStore.getStoredRefreshToken()
    authStore.clearSession(true)
    setStatus('unauthenticated')
    if (storedRefreshToken) {
      logoutRequest(storedRefreshToken)
    }
  }, [])

  return <AuthContext.Provider value={{ status, user, login, logout }}>{children}</AuthContext.Provider>
}
