import { apiGet } from './client'
import type { ApiDetailResponse } from '../types/common'
import type { AccessStatus } from '../types/warehouseAssignment'

// Satu-satunya endpoint yang tetap bisa diakses staff yang belum di-assign ke warehouse mana
// pun (§17 frontend-integration-guide.md) — semua endpoint /api/* lain balikin 403
// WAREHOUSE_ACCESS_NOT_CONFIGURED buat mereka sampai di-assign.
export function getAccessStatus() {
  return apiGet<ApiDetailResponse<AccessStatus>>('/me/access-status')
}
