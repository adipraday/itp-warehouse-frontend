import { authGet, authPost, authPut, authPatch, authDelete } from '../auth/authClient'
import type { AuthUser } from '../auth/authApi'
import type { PaginatedUsers, UserInput, UserSession } from '../types/user'

// Auth-backend konsisten bungkus object user tunggal di bawah key `user` (beda dari
// login/refresh yang balikin session object langsung tanpa wrapper lagi) — dikonfirmasi
// langsung dari response asli tiap endpoint di bawah, bukan tebakan dari dokumentasi.
export async function getMe(): Promise<AuthUser> {
  const result = await authGet<{ user: AuthUser }>('/users/me')
  return result.user
}

export async function updateMe(body: { name: string; email: string }): Promise<AuthUser> {
  const result = await authPut<{ user: AuthUser }>('/users/me', body)
  return result.user
}

export function changeMyPassword(body: { current_password: string; new_password: string }) {
  return authPatch<{ message?: string }>('/users/me/password', body)
}

export function listUsers(params: { page?: number; per_page?: number; search?: string }) {
  return authGet<PaginatedUsers>('/users', params)
}

export async function getUser(id: number): Promise<AuthUser> {
  const result = await authGet<{ user: AuthUser }>(`/users/${id}`)
  return result.user
}

/** Backend generate password acak + kirim link set-password ke email — body TIDAK boleh berisi password. */
export async function createUser(
  body: Omit<UserInput, 'status'>,
): Promise<AuthUser & { set_password_token?: string }> {
  const result = await authPost<{ user: AuthUser; set_password_token?: string }>('/users', body)
  return { ...result.user, set_password_token: result.set_password_token }
}

export async function updateUser(id: number, body: UserInput): Promise<AuthUser> {
  const result = await authPut<{ user: AuthUser }>(`/users/${id}`, body)
  return result.user
}

export function sendPasswordReset(id: number) {
  return authPost<{ set_password_token?: string }>(`/users/${id}/send-password-reset`)
}

export async function listUserSessions(id: number): Promise<UserSession[]> {
  const result = await authGet<{ sessions: UserSession[] }>(`/users/${id}/sessions`)
  return result.sessions
}

export function revokeUserSession(id: number, sessionId: number) {
  return authDelete<void>(`/users/${id}/sessions/${sessionId}`)
}
