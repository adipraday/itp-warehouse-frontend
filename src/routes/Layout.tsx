import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { usePermissions } from '../auth/permissions'
import { getHealth } from '../api/client'
import { NotificationBell } from '../components/NotificationBell'
import logoFull from '../assets/logo-full.png'
import { COMPANY_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from '../config/company'
import { useI18n } from '../i18n/useI18n'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { translate } from '../i18n/i18n'

interface NavItem {
  to: string
  label: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function buildNavGroups(
  canViewHpp: boolean,
  canManageUsers: boolean,
  canViewActivityLogs: boolean,
  canViewOwnerInsights: boolean,
): NavGroup[] {
  return [
    {
      label: '',
      items: [{ to: '/dashboard', label: translate('Dashboard') }],
    },
    // Pemantauan lintas cabang — hanya super-admin/owner/admin-bu (sama dengan gating backend).
    ...(canViewOwnerInsights
      ? [
          {
            label: translate('Pemantauan'),
            items: [
              { to: '/branch-comparison', label: translate('Perbandingan Cabang') },
              { to: '/cash-variance', label: translate('Selisih Kas') },
              { to: '/stuck-queue', label: translate('Antrean Macet') },
              { to: '/receivables', label: translate('Piutang & Hutang') },
              { to: '/unusual-activity', label: translate('Aktivitas Tidak Biasa') },
            ],
          },
        ]
      : []),
    // Nav "Users"/"Assign Staff" disembunyikan total (bukan disable) untuk role selain
    // super-admin/admin-bu — pola sama seperti Cost/HPP di Fase 12 (§13.2 frontend-roadmap.md).
    ...(canManageUsers
      ? [
          {
            label: translate('Administrasi'),
            items: [
              { to: '/users', label: translate('Users') },
              { to: '/warehouse-assignments', label: translate('Assign Staff') },
            ],
          },
        ]
      : []),
    {
      label: translate('Master Data'),
      items: [
        { to: '/warehouses', label: translate('Warehouses') },
        { to: '/items', label: translate('Items') },
        { to: '/contacts', label: translate('Contacts') },
      ],
    },
    {
      label: translate('Laporan'),
      items: [
        { to: '/stocks', label: translate('Stocks') },
        { to: '/stock-mutations', label: translate('Mutations') },
        // Cost/HPP disembunyikan total (bukan cuma disable) untuk role yang tidak berhak lihat
        // HPP (§7 frontend-integration-guide.md) — jangan sampai user tetap manggil API-nya.
        ...(canViewHpp ? [{ to: '/cost-layers', label: translate('Cost/HPP') }] : []),
        // Activity Logs di-scope per BU di backend — disembunyikan buat role yang nggak berhak
        // (staff/kasir/purchasing/finance), pola sama seperti Users & Cost/HPP.
        ...(canViewActivityLogs ? [{ to: '/activity-logs', label: translate('Activity Logs') }] : []),
      ],
    },
    {
      label: translate('Transaksi Inventory'),
      items: [
        { to: '/inbounds', label: translate('Barang Masuk') },
        { to: '/outbounds', label: translate('Barang Keluar') },
        { to: '/stock-transfers', label: translate('Transfers') },
        { to: '/stock-opnames', label: translate('Opname') },
      ],
    },
    {
      label: translate('Penjualan & Pembelian'),
      items: [
        // Sesi Kasir (§20 frontend-integration-guide.md) — tidak digating permission, sama
        // seperti route-nya di App.tsx: self-scoped ke sesi milik user yang login sendiri.
        { to: '/cash-session', label: translate('Sesi Kasir') },
        // Riwayat Sesi Kasir — browse lintas user, digating sama seperti Activity Logs.
        ...(canViewActivityLogs ? [{ to: '/cash-sessions/history', label: translate('Riwayat Sesi Kasir') }] : []),
        { to: '/sales', label: translate('Sales') },
        { to: '/purchases', label: translate('Purchases') },
        { to: '/invoices', label: translate('Invoices') },
        { to: '/returns', label: translate('Returns') },
      ],
    },
  ]
}

export default function Layout() {
  const { t } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { canViewHpp, canManageUsers, canViewActivityLogs, canViewOwnerInsights } = usePermissions()
  const navGroups = buildNavGroups(canViewHpp(), canManageUsers(), canViewActivityLogs(), canViewOwnerInsights())

  // Status koneksi backend di footer — polling ringan tiap 30 detik, tidak retry (kalau
  // gagal sekali langsung dianggap terputus, dot merah muncul cepat bukan nunggu retry).
  const { data: health, isError: backendDown } = useQuery({
    queryKey: ['health-check'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  })
  const backendOnline = !backendDown && health?.status === 'ok'

  // Tutup sidebar otomatis tiap kali pindah halaman.
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  function handleLogout() {
    // logout() menandai clearSession sebagai "intentional" (lihat authStore.ts) — RequireAuth
    // baca flag itu dan sengaja TIDAK bawa `state: {from}` saat redirect ke /login akibat logout
    // eksplisit ini, jadi navigate() di sini cuma jaring pengaman kalau RequireAuth belum sempat
    // re-render duluan; keduanya sekarang konsisten menuju /login tanpa `from` menempel.
    navigate('/login', { replace: true })
    logout()
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('Buka menu')}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M2.5 5h15M2.5 10h15M2.5 15h15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <img src={logoFull} alt={t('Warehouse System')} className="h-9 w-auto" />
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <NotificationBell />
              <Link to="/profile" className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900 hover:underline">{user.name}</p>
                <p className="text-xs text-slate-400">
                  {user.role}
                  {user.bu_name && <> &middot; {user.bu_name}</>}
                </p>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                {t('Logout')}
              </button>
            </div>
          )}
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          aria-label={t('Tutup menu')}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-slate-900/40 print:hidden"
        />
      )}

      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform duration-200 ease-out print:hidden"
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <span className="text-base font-semibold text-slate-900">{t('Menu')}</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('Tutup menu')}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label || 'root'}>
              {group.label && (
                <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `block rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-transparent text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {COMPANY_NAME} {t('— Warehouse System')}{' '}
            <span className="font-mono">v{__APP_VERSION__}</span>
          </span>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {t('Butuh bantuan?')}{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary-600 hover:underline">
                {SUPPORT_EMAIL}
              </a>{' '}
              &middot; {SUPPORT_PHONE}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-red-500'}`}
                aria-hidden="true"
              />
              {t('Backend')} {backendOnline ? t('terhubung') : t('terputus')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
