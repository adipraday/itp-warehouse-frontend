import { Outlet } from 'react-router-dom'

interface RequirePermissionProps {
  allowed: boolean
}

/**
 * Guard route berbasis permission (beda dari RequireAuth yang cuma cek status login). Kalau
 * `allowed` false, tampilkan pesan akses ditolak — BUKAN tabel/halaman kosong yang diam-diam
 * gagal (pola yang sama sekali dihindari sejak bug `buildUrl()` Fase 2, lihat progress-log.md).
 * Server tetap validator akhir (403 kalau nekat panggil API), ini murni UX di sisi client.
 */
export default function RequirePermission({ allowed }: RequirePermissionProps) {
  if (!allowed) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Akses Ditolak</h1>
        <p className="mt-2 text-sm text-slate-500">
          Anda tidak punya akses untuk membuka halaman ini. Hubungi admin kalau menurut Anda ini keliru.
        </p>
      </div>
    )
  }

  return <Outlet />
}
