import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { STAFF_ROLES } from '../auth/permissions'
import type { Role } from '../auth/permissions'
import { getAccessStatus } from '../api/me'

/**
 * Warehouse yang dipegang user (hasil assignment, §17) — `null` buat role yang scope-nya BU-wide
 * atau global (admin-bu/owner/super-admin), artinya "tidak dibatasi per warehouse". Pakai query
 * key yang sama dengan `RequireWarehouseAccess` (`['access-status']`), jadi di halaman manapun
 * datanya sudah ada di cache — guard itu sudah menunggu & memuatnya sebelum halaman dirender.
 */
export function useAssignedWarehouseIds(): number[] | null {
  const { user } = useAuth()
  const isStaff = !!user && STAFF_ROLES.includes(user.role as Role)

  const { data } = useQuery({
    queryKey: ['access-status'],
    queryFn: getAccessStatus,
    enabled: isStaff,
  })

  if (!isStaff) return null
  return data?.data.warehouse_ids ?? []
}
