// §17 frontend-integration-guide.md / user-warehouse-assignments.md — fitur murni
// warehouse-backend, nol perubahan token/klaim auth-backend.

export interface AccessStatus {
  role: string
  assigned: boolean
  warehouse_ids: number[]
}

export interface WarehouseAssignment {
  id: number
  // user_id sengaja tanpa FK (user hidup di auth-service, konvensi sama seperti created_by
  // di mana pun di codebase ini) — resolve ke nama lewat daftar user yang sudah di-fetch
  // terpisah (listUsers()), bukan dari field bawaan di sini.
  user_id: number
  warehouse_id: number
  assigned_by: number | null
  created_at: string
}

export interface WarehouseAssignmentInput {
  user_id: number
  warehouse_id: number
}
