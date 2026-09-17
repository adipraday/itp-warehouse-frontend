import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { getSaleReceipt } from '../../api/invoices'

interface SalesReceiptModalProps {
  open: boolean
  onClose: () => void
  saleId: number
}

// UUID generic/"cheap China" printer thermal Bluetooth LE — paling umum dipakai printer thermal
// murah yang beredar. Kalau printer lain tidak connect, ganti sesuai dokumentasi/SDK bawaan
// printer-nya (§19 frontend-integration-guide.md, contoh kode persis dari situ).
const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'
const BLE_CHUNK_SIZE = 100

/**
 * Cetak struk (§19 frontend-integration-guide.md, 2026-09-13) — SALES-only, cuma buat sale
 * COMPLETED. Backend nyiapin 2 bentuk: `text_lines` (preview di layar) dan `escpos_base64` (byte
 * lengkap siap tulis ke printer thermal via Web Bluetooth, sudah termasuk perintah cut kertas).
 * Frontend tidak perlu paham format ESC/POS sama sekali.
 *
 * **Catatan verifikasi**: bagian fetch data (`text_lines`, breakdown angka) diverifikasi live
 * lewat browser sungguhan. Bagian tulis-ke-printer-Bluetooth TIDAK BISA diverifikasi penuh tanpa
 * hardware printer thermal fisik yang benar-benar terpasang — kode di bawah ini disalin persis
 * dari contoh resmi di dokumentasi (termasuk UUID service/characteristic), jadi risikonya rendah,
 * tapi "berhasil connect & tercetak" cuma bisa dikonfirmasi oleh user dengan printer aslinya.
 */
export function SalesReceiptModal({ open, onClose, saleId }: SalesReceiptModalProps) {
  const toast = useToast()
  const [paperWidth, setPaperWidth] = useState<58 | 80>(58)
  const [printing, setPrinting] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sales', saleId, 'receipt', paperWidth],
    queryFn: () => getSaleReceipt(saleId, paperWidth),
    enabled: open,
  })

  // `navigator.bluetooth` cuma ada di Chrome/Edge desktop & Android — tidak ada sama sekali di
  // Safari/iOS (bukan `undefined` yang error kalau diakses, browser itu memang tidak punya
  // propertinya). Deteksi dulu sebelum nawarin tombol cetak supaya pesannya jelas, bukan error
  // JS mentah kalau diklik di browser yang tidak didukung.
  const bluetoothSupported = typeof navigator !== 'undefined' && !!navigator.bluetooth

  async function handlePrint() {
    if (!data) return
    if (!bluetoothSupported) {
      toast.show('Browser ini tidak mendukung Web Bluetooth. Pakai Chrome/Edge di desktop atau Android.', 'error')
      return
    }
    setPrinting(true)
    try {
      const bytes = Uint8Array.from(atob(data.data.escpos_base64), (c) => c.charCodeAt(0))
      const device = await navigator.bluetooth!.requestDevice({ filters: [{ services: [SERVICE_UUID] }] })
      const server = await device.gatt?.connect()
      if (!server) throw new Error('Gagal terhubung ke printer.')
      const service = await server.getPrimaryService(SERVICE_UUID)
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID)
      for (let i = 0; i < bytes.length; i += BLE_CHUNK_SIZE) {
        await characteristic.writeValue(bytes.slice(i, i + BLE_CHUNK_SIZE))
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
      toast.show('Struk terkirim ke printer.', 'success')
    } catch (err) {
      // User batal pilih device di dialog chooser browser — bukan error sungguhan, jangan
      // tampilkan sebagai kegagalan.
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        // no-op
      } else {
        toast.show(err instanceof Error ? err.message : 'Gagal mencetak struk.', 'error')
      }
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cetak Struk">
      {isLoading && <p className="text-sm text-slate-400">Memuat struk...</p>}
      {isError && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
      {data && (
        <>
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="text-slate-500">Lebar kertas:</span>
            {([58, 80] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setPaperWidth(w)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  paperWidth === w
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {w}mm
              </button>
            ))}
          </div>

          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800">
            {data.data.text_lines.join('\n')}
          </pre>

          {!bluetoothSupported && (
            <p className="mt-2 text-xs text-amber-600">
              Browser ini tidak mendukung Web Bluetooth — bisa lihat preview di atas, tapi cetak
              langsung ke printer thermal cuma jalan di Chrome/Edge (desktop atau Android).
            </p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing || !bluetoothSupported}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {printing ? 'Mencetak...' : 'Cetak via Bluetooth'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
