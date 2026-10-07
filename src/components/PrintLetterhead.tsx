import { useAuth } from '../auth/useAuth'
import type { Warehouse } from '../types/warehouse'

/**
 * Kop surat dokumen cetak (invoice, surat jalan): judul = nama BU pemilik dokumen, subjudul = nama
 * warehouse (pusat/cabang) yang menerbitkan, lalu alamat warehouse. Sama dengan header struk
 * thermal dari backend (BU → warehouse → alamat), supaya semua cetakan satu identitas.
 *
 * Nama BU datang dari `warehouse.business_unit` (di-resolve backend, lihat types/warehouse.ts).
 * Kalau tidak ada (null / belum termuat), fallback ke `user.bu_name` selama warehouse itu memang
 * milik BU user yang login. Kalau tetap tidak ketahuan, judulnya jadi nama warehouse (tanpa
 * subjudul dobel) — sengaja BUKAN nama perusahaan platform, karena dokumen ini milik tenant.
 */
export function PrintLetterhead({ warehouse }: { warehouse: Warehouse | undefined }) {
  const { user } = useAuth()

  const buName =
    warehouse?.business_unit?.name ??
    (warehouse?.bu_id != null && warehouse.bu_id === user?.bu_id ? user?.bu_name : null) ??
    null

  const title = buName ?? warehouse?.name ?? '-'
  const subtitle = buName ? warehouse?.name : null

  return (
    <div>
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm font-medium text-slate-600">{subtitle}</p>}
      {warehouse?.address && <p className="text-sm text-slate-500">{warehouse.address}</p>}
    </div>
  )
}
