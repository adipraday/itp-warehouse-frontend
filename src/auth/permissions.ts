import { useAuth } from './useAuth'

export type Role =
  | 'super-admin'
  | 'owner'
  | 'admin-bu'
  | 'admin-warehouse'
  | 'staff-gudang'
  | 'kasir-sales'
  | 'purchasing'
  | 'finance'

// Role level-staff yang kena fitur assign-per-warehouse (§17 frontend-integration-guide.md) —
// admin-bu/owner/super-admin TIDAK pernah kena ini, scope mereka tetap BU-wide (atau global).
// `admin-warehouse` (§28, 2026-09-21) MASUK di sini meski namanya mirip admin-bu — beda dari
// admin-bu, role ini justru DIRANCANG buat di-scope ke satu warehouse lewat mekanisme ini.
export const STAFF_ROLES: Role[] = ['admin-warehouse', 'staff-gudang', 'kasir-sales', 'purchasing', 'finance']

export type Resource =
  | 'warehouses'
  | 'items'
  | 'contacts'
  | 'inbounds'
  | 'outbounds'
  | 'stock-transfers'
  | 'stock-opnames'
  | 'sales'
  | 'purchases'
  | 'returns'
  | 'payments'

/**
 * Terjemahan matrix role §5 frontend-integration-guide.md. `complete`/`cancel` diperlakukan
 * sebagai bagian dari permission "bisa nulis" resource (guide cuma punya kolom terpisah untuk
 * approve/reject/submit, bukan complete/cancel) — lihat catatan Fase 12 di docs/progress-log.md.
 * Ini murni gating UI (tombol mana yang ditampilkan) — backend tetap validator akhir yang
 * sebenarnya lewat 403, jadi interpretasi ini aman walau kurang presisi di kasus tepi.
 *
 * `owner` (§14, 2026-09-08) SENGAJA tidak dimasukkan ke matrix manapun di bawah (write/approve/
 * submit) — backend nolak 403 tanpa kecuali buat role ini di semua endpoint tulis, jadi cukup
 * tidak pernah ditambahkan ke array Role[] manapun di sini; `canWrite`/`canApprove`/`canSubmit`
 * otomatis balikin false buat owner tanpa perlu baris pengecualian eksplisit.
 */
// `admin-warehouse` (§28, 2026-09-21): full write access to every day-to-day operational
// resource below EXCEPT `warehouses` — deliberately mirrors role-matrix.js's ALL_STAFF-based
// entries plus its own additions to items/contacts/sales/cash-sessions/purchases/payments.
// Never added to APPROVE_MATRIX (segregation of duty — same reasoning as staff-gudang today).
const WRITE_MATRIX: Record<Resource, Role[]> = {
  warehouses: ['super-admin', 'admin-bu'],
  items: ['super-admin', 'admin-bu', 'admin-warehouse', 'purchasing'],
  contacts: ['super-admin', 'admin-bu', 'admin-warehouse', 'kasir-sales', 'purchasing'],
  inbounds: ['super-admin', 'admin-bu', 'admin-warehouse', 'staff-gudang', 'purchasing'],
  outbounds: ['super-admin', 'admin-bu', 'admin-warehouse', 'staff-gudang', 'kasir-sales'],
  'stock-transfers': ['super-admin', 'admin-bu', 'admin-warehouse', 'staff-gudang'],
  'stock-opnames': ['super-admin', 'admin-bu', 'admin-warehouse', 'staff-gudang'],
  sales: ['super-admin', 'admin-bu', 'admin-warehouse', 'kasir-sales'],
  purchases: ['super-admin', 'admin-bu', 'admin-warehouse', 'purchasing'],
  returns: ['super-admin', 'admin-bu', 'admin-warehouse', 'staff-gudang', 'kasir-sales'],
  // Update 2026-09-13 (§17 frontend-integration-guide.md): kasir-sales sekarang boleh POST
  // /api/payments juga (sebelumnya cuma admin-bu/finance) — biar kasir bisa nyelesain 1 transaksi
  // penuh (bikin sale → complete → catat bayar) tanpa admin-bu turun tangan tiap kali. Ke-lewat
  // waktu itu diimplementasikan di Fase 19 (diskon/kembalian/metode bayar) — matrix ini nggak
  // ikut di-update walau kodenya sendiri (PaymentFormModal dkk) udah dibangun buat kasir.
  payments: ['super-admin', 'admin-bu', 'admin-warehouse', 'finance', 'kasir-sales'],
}

const APPROVE_MATRIX: Partial<Record<Resource, Role[]>> = {
  'stock-transfers': ['super-admin', 'admin-bu'],
  'stock-opnames': ['super-admin', 'admin-bu'],
  returns: ['super-admin', 'admin-bu'],
}

const SUBMIT_MATRIX: Partial<Record<Resource, Role[]>> = {
  'stock-opnames': ['super-admin', 'admin-bu', 'admin-warehouse', 'staff-gudang'],
}

const HPP_ROLES: Role[] = ['super-admin', 'owner', 'admin-bu', 'admin-warehouse', 'purchasing', 'finance']

export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role as Role | undefined

  function canWrite(resource: Resource): boolean {
    return !!role && WRITE_MATRIX[resource].includes(role)
  }

  function canApprove(resource: Resource): boolean {
    return !!role && (APPROVE_MATRIX[resource]?.includes(role) ?? false)
  }

  function canSubmit(resource: Resource): boolean {
    return !!role && (SUBMIT_MATRIX[resource]?.includes(role) ?? false)
  }

  function canViewHpp(): boolean {
    return !!role && HPP_ROLES.includes(role)
  }

  // Manajemen user (§13.2 frontend-roadmap.md) — resource di auth-backend, bukan warehouse-backend,
  // makanya tidak masuk WRITE_MATRIX di atas (itu khusus resource `/api/*`).
  function canManageUsers(): boolean {
    return role === 'super-admin' || role === 'admin-bu'
  }

  // Activity Logs — endpoint warehouse-backend sudah di-scope per BU (2026-09-09):
  // admin-bu lihat log BU-nya + grant, owner lihat log semua BU company-nya, super-admin semua.
  // Baris bu_id NULL cuma kelihatan super-admin. Akses log lintas-BU → 404 (bukan 403).
  // admin-warehouse (§28, 2026-09-21) ditambahkan — backend sudah otomatis mempersempit hasilnya
  // ke assignedWarehouseIds lewat mekanisme STAFF_ROLES yang sama, jadi aman ditampilkan: branch
  // head wajar lihat log warehouse-nya sendiri.
  function canViewActivityLogs(): boolean {
    return role === 'super-admin' || role === 'admin-bu' || role === 'owner' || role === 'admin-warehouse'
  }

  return { role, canWrite, canApprove, canSubmit, canViewHpp, canManageUsers, canViewActivityLogs }
}
