import { useCallback, useSyncExternalStore } from 'react'
import { getLanguage, setLanguage, subscribe, translate } from './i18n'
import type { TranslateParams } from './i18n'
import type { Language } from './i18n'

/**
 * Hook bahasa. Komponen yang memakainya dirender ulang saat bahasa berganti, dan `t` selalu
 * membaca bahasa aktif saat dipanggil. Di luar komponen (util, fungsi biasa) pakai `translate`.
 */
export function useI18n() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage)
  // `t` berganti identitas hanya saat bahasa berganti, sehingga memo/effect yang bergantung
  // padanya ikut menghitung ulang.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key: string, params?: TranslateParams) => translate(key, params), [language])
  return { t, language, setLanguage: setLanguage as (language: Language) => void }
}
