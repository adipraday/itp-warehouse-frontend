import { useI18n } from '../i18n/useI18n'
export function DifferenceBadge({ value }: { value: number }) {
  const { t } = useI18n()
  if (value > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        {t('Surplus +')}{value}
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        {t('Defisit')} {value}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {t('Sesuai')}
    </span>
  )
}
