import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../api/client'
import { getErrorMessage } from '../api/errors'
import { useToast } from '../hooks/useToast'
import { StatusBadge } from '../components/StatusBadge'
import { useI18n } from '../i18n/useI18n'

export default function HealthCheckPage() {
  const { t } = useI18n()
  const toast = useToast()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{t('Warehouse System')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('Frontend scaffold — Fase 1: Core Infrastructure')}</p>

        <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-100 p-4 text-sm">
          {isLoading && <span className="text-slate-500">{t('Menghubungi backend...')}</span>}
          {isError && <span className="text-red-600">{t('Gagal konek ke API:')} {getErrorMessage(error)}</span>}
          {data && (
            <>
              <span className="text-slate-600">{t('API status:')}</span>
              <StatusBadge status={data.status.toUpperCase()} />
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => toast.show(t('Toast dan komponen dasar sudah siap.'), 'success')}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('Test Toast')}
        </button>
      </div>
    </div>
  )
}
