const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL as string

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  bu_id: number | null
  bu_name: string | null
  status: string
  email_verified_at: string | null
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_token_expires_at: string
  user: AuthUser
}

export class AuthApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.code = code
    this.status = status
  }
}

async function authRequest(path: string, body: unknown): Promise<AuthSession> {
  const res = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)

  // Bentuk error auth-backend belum didokumentasikan eksplisit untuk kasus gagal — parse
  // defensif untuk 2 kemungkinan bentuk umum: { success:false, message } atau { error:{code,message} }.
  if (!res.ok || json?.success === false) {
    const message = json?.message ?? json?.error?.message ?? `Request gagal dengan status ${res.status}`
    const code = json?.error?.code ?? json?.code ?? 'AUTH_ERROR'
    throw new AuthApiError(message, code, res.status)
  }

  return json.data as AuthSession
}

export function login(email: string, password: string): Promise<AuthSession> {
  return authRequest('/auth/login', { email, password })
}

export function refresh(refreshToken: string): Promise<AuthSession> {
  return authRequest('/auth/refresh', { refresh_token: refreshToken })
}

/** Best-effort — logout tetap jalan di sisi client walau request ini gagal (mis. sudah offline). */
export function logoutRequest(refreshToken: string): Promise<void> {
  return fetch(`${AUTH_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(() => undefined)
    .catch(() => undefined)
}

// `authRequest` di atas sengaja balikin `AuthSession` (dipakai login/refresh) — forgot/reset
// password balikin bentuk beda (cuma `{ message }`, tidak ada session/token, sesuai desain:
// reset password sukses me-revoke semua refresh token lama, jadi user WAJIB login ulang manual,
// bukan auto-login). Helper generik terpisah di bawah, bukan dipaksa lewat authRequest.
async function authRequestMessage(path: string, body: unknown): Promise<{ message: string }> {
  const res = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)

  if (!res.ok || json?.success === false) {
    const message = json?.message ?? json?.error?.message ?? `Request gagal dengan status ${res.status}`
    const code = json?.error?.code ?? json?.code ?? 'AUTH_ERROR'
    throw new AuthApiError(message, code, res.status)
  }

  return { message: json?.message ?? '' }
}

// Response SELALU sama (sukses) baik email terdaftar atau tidak — sengaja, biar tidak bisa
// dipakai buat nebak email mana yang punya akun (account enumeration). Jangan tampilkan pesan
// beda berdasarkan hasil ini.
export function forgotPassword(email: string): Promise<{ message: string }> {
  return authRequestMessage('/auth/forgot-password', { email })
}

// Token dari link email (§7A auth-backend-requirements.md) — dipakai juga buat link aktivasi
// user baru (`set_password_token` dari `POST /users`), satu endpoint yang sama buat dua kasus
// (keduanya sama-sama "konsumsi single-use token, set password baru"). Sukses me-revoke semua
// refresh token lama user itu, jadi TIDAK balikin session — redirect ke /login setelah sukses.
export function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return authRequestMessage('/auth/reset-password', { token, new_password: newPassword })
}
