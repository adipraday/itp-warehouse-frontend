import { getErrorMessage } from '../api/errors'
import { useI18n } from '../i18n/useI18n'

export function ErrorState({ error }: { error: unknown }) {
  const { t } = useI18n()
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {t('Gagal memuat data:')} {getErrorMessage(error)}
    </div>
  )
}
