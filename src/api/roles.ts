import { authGet } from '../auth/authClient'
import type { AssignableRole } from '../types/user'

/** JANGAN hardcode daftar role — backend balikin persis role yang boleh dipilih requester saat ini. */
export async function listAssignableRoles(): Promise<AssignableRole[]> {
  const result = await authGet<{ roles: AssignableRole[] }>('/roles')
  return result.roles
}
