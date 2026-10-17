import { tk } from './i18n'

// Teks yang tidak muncul sebagai t('...') di tempat ia ditampilkan, tetapi tetap diterjemahkan saat
// tampil lewat t(nilai). Didaftarkan di sini supaya `npm run i18n:check` ikut memeriksa kamusnya.

// Label status berbahasa Indonesia (turunan dari status + tahap, bukan kode dari server) yang
// ditampilkan StatusBadge; kode seperti COMPLETED tampil apa adanya.
export const STATUS_LABELS = [tk('MENUNGGU PERSETUJUAN'), tk('DITERIMA SEBAGIAN'), tk('DITAHAN')]
