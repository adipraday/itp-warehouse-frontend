/**
 * True kalau data yang sedang ditampilkan beneran lintas >1 BU — dipakai buat memutuskan
 * apakah kolom "BU" perlu ditampilkan sama sekali (§14/§15 frontend-integration-guide.md).
 * User BU tunggal biasa tidak pernah lihat kolom ini, cuma relevan buat admin-bu ber-grant
 * atau `owner` yang datanya otomatis gabungan beberapa BU.
 */
export function hasMultipleBuIds(rows: { bu_id?: number | null }[]): boolean {
  const distinct = new Set(rows.map((r) => r.bu_id).filter((id): id is number => id != null))
  return distinct.size > 1
}
