import { LANGUAGES } from '../i18n/i18n'
import { useI18n } from '../i18n/useI18n'

interface LanguageSwitcherProps {
  // 'light' untuk latar terang (halaman login), 'dark' untuk bilah gelap.
  tone?: 'light' | 'dark'
}

// Pengalih bahasa Indonesia / English. Pilihan disimpan di browser dan berlaku seketika.
export function LanguageSwitcher({ tone = 'light' }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n()
  const base = tone === 'dark' ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'
  const active = tone === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'

  return (
    <div role="group" aria-label={t('Bahasa')} className={`inline-flex overflow-hidden rounded-md border text-xs font-semibold ${base}`}>
      {LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          title={option.label}
          aria-pressed={language === option.code}
          onClick={() => setLanguage(option.code)}
          className={`px-2.5 py-1 ${language === option.code ? active : 'hover:bg-slate-100/10'}`}
        >
          {option.short}
        </button>
      ))}
    </div>
  )
}
