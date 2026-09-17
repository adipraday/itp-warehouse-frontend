import type { PaginationMeta } from './common'
import type { AuthUser } from '../auth/authApi'

export type { AuthUser as User } from '../auth/authApi'

export interface UserInput {
  name: string
  email: string
  role: string
  bu_id: number | null
  status: string
}

/**
 * Item respons `GET /roles` — daftar role yang BOLEH di-assign requester saat ini (§13.2
 * poin 3, frontend-roadmap.md). Beda dari `Role` union di `auth/permissions.ts` (itu untuk
 * gating UI warehouse-backend) — sengaja dinamai `AssignableRole` supaya tidak tabrakan nama.
 */
export interface AssignableRole {
  name: string
  description: string
  requires_bu: boolean
}

// Ini sebenarnya riwayat refresh-token (bukan "device session" dengan IP/user-agent) — tiap
// rotasi token bikin record baru, dirantai lewat `replaced_by_token_id`. Cuma status "active"
// yang masuk akal buat di-revoke (lihat UserSessionsModal.tsx).
export interface UserSession {
  id: number
  status: 'active' | 'used' | 'revoked'
  created_at: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  replaced_by_token_id: number | null
}

export interface PaginatedUsers {
  users: AuthUser[]
  pagination: PaginationMeta & { total_pages: number }
}

export interface BusinessUnit {
  id: number
  name: string
}
