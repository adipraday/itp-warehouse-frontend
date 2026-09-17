export type ContactType = 'supplier' | 'customer' | 'both'

export interface Contact {
  id: number
  type: ContactType
  name: string
  phone: string | null
  email: string | null
  address: string | null
  // Contacts sekarang di-scope per BU juga (§15 frontend-integration-guide.md, 2026-09-08) —
  // sebelumnya master data global murni. Dipakai buat label BU per baris kalau user lihat
  // data lintas-BU (grant/owner), sama seperti `bu_id` di Warehouse (§14).
  bu_id?: number | null
  created_at: string
  updated_at: string
}

export interface ContactInput {
  type: ContactType
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}
