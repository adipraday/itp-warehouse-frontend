/**
 * Trigger download file dari `Blob` di browser (§26 frontend-integration-guide.md, 2026-09-14 —
 * template import & export item balikin file beneran, bukan JSON). Pola persis dari contoh kode
 * resmi di dokumentasi: `<a>` sementara + `URL.createObjectURL`, langsung dibuang lagi setelah
 * di-klik supaya tidak nyisa di DOM atau bocor memory dari object URL yang tidak di-revoke.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
