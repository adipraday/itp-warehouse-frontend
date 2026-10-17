import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import logoIcon from '../assets/logo-icon.png'
import { useI18n } from '../i18n/useI18n'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

/**
 * Halaman buat staff (staff-gudang/kasir-sales/purchasing/finance) yang belum di-assign ke
 * warehouse mana pun (§17 frontend-integration-guide.md) — satu-satunya endpoint yang tetap
 * bisa mereka akses ke depan cuma `/me/access-status`, jadi di luar itu memang tidak ada apa
 * pun buat ditampilkan selain pesan ini + opsi logout.
 */
export default function AccessNoticePage() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    navigate('/login', { replace: true })
    logout()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="fixed right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <img src={logoIcon} alt={t('Warehouse System')} className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{t('Akses Anda Belum Disiapkan')}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {user?.name ? t('Halo {name}, akun', { name: user.name }) : t('Akun')} {t('Anda belum di-assign ke warehouse mana pun. Hubungi admin-bu Anda untuk mendapatkan akses.')}
        </p>
        {user?.bu_name && <p className="mt-1 text-xs text-slate-400">{t('Business Unit:')} {user.bu_name}</p>}

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t('Logout')}
        </button>
      </div>
    </div>
  )
}
