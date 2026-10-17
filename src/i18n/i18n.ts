import { en } from './en'

// Dua bahasa antarmuka: Indonesia (bawaan) dan Inggris.
//
// Teks Indonesia yang tampil di layar dipakai SEBAGAI KUNCI: `t('Simpan')`. Bahasa Indonesia tidak
// punya kamus sendiri (kuncinya sudah teksnya), dan bahasa Inggris dicari di `en.ts`. Kunci yang
// belum ada di kamus Inggris jatuh kembali ke teks Indonesia — tidak pernah kosong atau menampilkan
// nama kunci. `npm run i18n:check` memastikan semua kunci di kode punya padanan Inggris.
//
// Parameter ditulis `{nama}`: `t('Halo {name}', { name })`.
export type Language = 'id' | 'en'

export const LANGUAGES: { code: Language; label: string; short: string }[] = [
  { code: 'id', label: 'Bahasa Indonesia', short: 'ID' },
  { code: 'en', label: 'English', short: 'EN' },
]

const STORAGE_KEY = 'warkas.language'

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'id' || stored === 'en') return stored
  } catch {
    // localStorage bisa tidak tersedia (mode privat, data situs diblokir) — pakai bawaan.
  }
  return 'id'
}

let current: Language = readStoredLanguage()
const listeners = new Set<() => void>()

export function getLanguage(): Language {
  return current
}

export function setLanguage(language: Language): void {
  if (language === current) return
  current = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Tidak tersimpan, tetap berlaku selama sesi.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = language
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export type TranslateParams = Record<string, string | number | null | undefined>

export function translate(key: string, params?: TranslateParams): string {
  const text = current === 'en' ? (en[key] ?? key) : key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name] ?? '') : match))
}

/** Lokal untuk Intl / toLocaleString sesuai bahasa yang aktif. */
export function currentLocale(): string {
  return current === 'en' ? 'en-GB' : 'id-ID'
}

if (typeof document !== 'undefined') document.documentElement.lang = current

/**
 * Penanda kunci terjemahan untuk teks di tingkat modul (konstanta label): mengembalikan teksnya apa
 * adanya, tetapi membuatnya terdaftar bagi `npm run i18n:check`. Tempat menampilkannya yang
 * memanggil `t(nilai)` / `translate(nilai)`, sehingga ikut berganti bahasa.
 */
export const tk = (key: string): string => key
