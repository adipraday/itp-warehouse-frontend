import { authGet } from '../auth/authClient'
import type { AssignableRole } from '../types/user'

/**
 * JANGAN hardcode daftar role — backend balikin persis role yang boleh dipilih requester saat ini.
 *
 * `buId` mempersempit ke role yang cocok service BU itu. App ini single-service (warehouse) dan
 * dipakai admin-bu yang bekerja di BU sendiri, jadi backend sudah otomatis fallback ke service BU
 * home-nya walau `buId` tidak dikirim — parameter ini cuma jaring pengaman eksplisit (mis. kalau
 * suatu saat super-admin ikut memakai layar ini).
 */
export async function listAssignableRoles(buId?: number | null): Promise<AssignableRole[]> {
  const query = buId ? `?bu_id=${buId}` : ''
  const result = await authGet<{ roles: AssignableRole[] }>(`/roles${query}`)
  return result.roles
}
