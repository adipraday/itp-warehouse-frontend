import { parseMoney } from './money'

// Pembantu ekspor Excel (.xlsx) untuk halaman Pemantauan. File dibuat di browser dengan
// `write-excel-file`, dimuat dinamis hanya saat tombol "Unduh Excel" ditekan, jadi tidak menambah
// ukuran halaman lain. Angka ditulis sebagai ANGKA sungguhan (bukan teks berformat) supaya bisa
// dijumlah/diurutkan di Excel.

export interface XlsxCell {
  value: string | number | null
  type?: StringConstructor | NumberConstructor
  format?: string
  fontWeight?: 'bold'
}

export type XlsxRow = (XlsxCell | string | number | null)[]

export interface SheetSpec {
  sheet: string
  data: XlsxRow[]
  /** Lebar kolom dalam karakter, urut dari kolom pertama. */
  widths?: number[]
}

export const bold = (value: string): XlsxCell => ({ value, fontWeight: 'bold' })

/** Rupiah utuh sebagai angka, tampil "1.234.567" ala Excel setempat. */
export const rupiah = (value: string | number, isBold = false): XlsxCell => ({
  value: Math.round(parseMoney(value)),
  type: Number,
  format: '#,##0',
  ...(isBold ? { fontWeight: 'bold' as const } : {}),
})

export const integer = (value: number, isBold = false): XlsxCell => ({
  value,
  type: Number,
  format: '#,##0',
  ...(isBold ? { fontWeight: 'bold' as const } : {}),
})

/** Persentase sebagai angka (25.9 → "25,9"); `null` jadi sel kosong. Judul kolomnya yang memuat "(%)". */
export const percent = (value: number | null): XlsxCell | null =>
  value == null ? null : { value, type: Number, format: '0.0' }

export const headerRow = (...titles: string[]): XlsxRow => titles.map((title) => bold(title))

/** Nama file aman + tanggal, mis. `perbandingan-cabang-2026-10-12.xlsx`. */
export function reportFileName(slug: string, isoDate: string): string {
  return `${slug}-${isoDate}.xlsx`
}

export async function downloadXlsx(fileName: string, sheets: SheetSpec[]): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const spec = sheets.map((sheet) => ({
    sheet: sheet.sheet,
    data: sheet.data,
    columns: sheet.widths?.map((width) => ({ width })),
  }))
  // Tipe pustaka sangat ketat terhadap bentuk sel; bentuk kita (lihat XlsxCell) sudah sesuai
  // dokumentasinya, jadi cukup dilonggarkan di sini, satu-satunya tempat pemanggilannya.
  await writeXlsxFile(spec as never).toFile(fileName)
}
