import { useAuth } from '../auth/useAuth'
import { useI18n } from '../i18n/useI18n'

/**
 * Label BU per baris — nama asli (`user.bu_name`) kalau baris itu BU home user sendiri,
 * kalau bukan cukup `BU #<id>` mentah (tidak ada endpoint list-semua-BU buat resolve nama
 * BU lain — lihat catatan Fase 13/14 di docs/progress-log.md). Dipakai bareng
 * `hasMultipleBuIds()` (src/utils/bu.ts) buat memutuskan kolom ini perlu tampil atau tidak.
 */
export function BuLabel({ buId }: { buId: number | null | undefined }) {
  const { t } = useI18n()
  const { user } = useAuth()
  if (buId != null && buId === user?.bu_id && user?.bu_name) {
    return <>{user.bu_name}</>
  }
  return <span className="text-slate-400">{t('BU #')}{buId}</span>
}
