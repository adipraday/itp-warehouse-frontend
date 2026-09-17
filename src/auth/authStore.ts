import { refresh as refreshApiCall } from './authApi'
import type { AuthUser } from './authApi'

const REFRESH_TOKEN_KEY = 'warehouse_refresh_token'

interface Session {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

// Access token cuma hidup di memori (variabel module-level ini) — sengaja TIDAK di-localStorage
// untuk kurangi risiko XSS, sesuai rekomendasi frontend-integration-guide.md §3. Hilang tiap
// full reload, makanya butuh rehydration lewat refresh_token saat app mount (lihat AuthContext).
let accessToken: string | null = null
let user: AuthUser | null = null
const subscribers = new Set<() => void>()

// Ditandai saat clearSession() dipicu oleh aksi Logout eksplisit (bukan token expired/refresh
// gagal). RequireAuth baca+reset flag ini buat memutuskan apakah redirect ke /login perlu bawa
// `state: {from: location}` atau tidak — logout eksplisit TIDAK boleh bawa "from", supaya login
// berikutnya (bisa user lain di komputer yang sama) selalu mendarat di /dashboard, bukan nyasar
// balik ke halaman sebelum logout. Lihat catatan Fase 12.1 di docs/progress-log.md untuk detail
// race condition yang bikin ini perlu jadi flag eksplisit, bukan andalkan urutan pemanggilan.
let intentionalLogout = false

// Sengaja dipisah baca (pure, aman dipanggil dari render) vs reset (side effect, HARUS dipanggil
// dari useEffect — bukan dari body komponen langsung). React (StrictMode/dev) bisa invoke fungsi
// render lebih dari sekali per commit; kalau reset digabung ke fungsi baca yang dipanggil dari
// render, invocation pertama (yang bisa dibuang React) sudah keburu reset flag-nya, jadi
// invocation kedua (yang beneran dipakai) baca nilai yang salah. Lihat RequireAuth.tsx.
export function wasIntentionalLogout(): boolean {
  return intentionalLogout
}

export function resetIntentionalLogout(): void {
  intentionalLogout = false
}

function notify(): void {
  subscribers.forEach((callback) => callback())
}

export function getAccessToken(): string | null {
  return accessToken
}

export function getUser(): AuthUser | null {
  return user
}

/** Update user in-memory tanpa perlu sesi baru — dipakai setelah `PUT /users/me` sukses (ProfilePage)
 * supaya nama/email yang berubah langsung kelihatan di header (Layout.tsx) tanpa refresh manual. */
export function updateUser(updatedUser: AuthUser): void {
  user = updatedUser
  notify()
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  accessToken = session.accessToken
  user = session.user
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  } catch {
    // localStorage tidak tersedia (mis. private browsing) — sesi tetap jalan di memori untuk tab ini.
  }
  notify()
}

export function clearSession(intentional = false): void {
  accessToken = null
  user = null
  if (intentional) intentionalLogout = true
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // ignore
  }
  notify()
}

export function subscribe(callback: () => void): () => void {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

// De-duplikasi: kalau beberapa request gagal 401 bersamaan, semuanya nunggu 1 refresh call yang
// sama (bukan trigger banyak /auth/refresh sekaligus) — penting karena refresh token lama langsung
// invalid setelah dipakai, refresh ganda bisa kena deteksi reuse & semua token user di-revoke.
let refreshPromise: Promise<string> | null = null

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  const storedRefreshToken = getStoredRefreshToken()
  if (!storedRefreshToken) {
    clearSession()
    return Promise.reject(new Error('Tidak ada sesi untuk di-refresh.'))
  }

  refreshPromise = refreshApiCall(storedRefreshToken)
    .then((session) => {
      setSession({ accessToken: session.access_token, refreshToken: session.refresh_token, user: session.user })
      return session.access_token
    })
    .catch((err) => {
      clearSession()
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}
