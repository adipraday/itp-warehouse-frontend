import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { STAFF_ROLES } from './permissions'
import type { Role } from './permissions'
import { getAccessStatus } from '../api/me'

/**
 * Guard tambahan khusus role staff (§17 frontend-integration-guide.md) — dicek SEKALI setelah
 * login/refresh, sebelum staff sempat lihat halaman apa pun yang datanya bakal kosong/403 semua
 * kalau ternyata belum di-assign ke warehouse. admin-bu/owner/super-admin tidak pernah kena
 * pengecekan ini (langsung `<Outlet/>`, query bahkan tidak di-enable — lihat `STAFF_ROLES`).
 *
 * Kasus mid-session (assignment dicabut pas staff masih login) ditangani terpisah di
 * `client.ts` lewat redirect langsung begitu ada respons `WAREHOUSE_ACCESS_NOT_CONFIGURED` —
 * guard ini cuma buat pengecekan awal sekali per sesi.
 */
export default function RequireWarehouseAccess() {
  const { user } = useAuth()
  const isStaff = !!user && STAFF_ROLES.includes(user.role as Role)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['access-status'],
    queryFn: getAccessStatus,
    enabled: isStaff,
    // WAJIB fetch ulang tiap mount (bukan cuma sekali/staleTime lama) — query cache di
    // TanStack Query itu global per queryKey, bukan per sesi login. Tanpa ini, staff yang baru
    // di-assign admin lalu login ulang di tab yang SAMA bakal masih baca status lama dari cache
    // (ketauan langsung pas live-test: assigned:false basi ke-serve lagi walau sudah di-assign).
    // Component ini cuma remount pas genuinely ada siklus logout→login baru (bukan navigasi
    // biasa antar halaman, itu Outlet doang yang ganti) — jadi aman, tidak refetch tiap klik menu.
    refetchOnMount: 'always',
  })

  if (!isStaff) {
    return <Outlet />
  }

  if (isLoading || isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Memeriksa akses...
      </div>
    )
  }

  if (data && !data.data.assigned) {
    return <Navigate to="/access-notice" replace />
  }

  return <Outlet />
}
