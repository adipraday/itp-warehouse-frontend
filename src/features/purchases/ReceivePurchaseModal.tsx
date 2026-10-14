import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextareaField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { useIdempotencyKey } from '../../hooks/useIdempotencyKey'
import { getErrorMessage } from '../../api/errors'
import { receivePurchase } from '../../api/purchases'
import { formatRupiah, parseMoney } from '../../utils/money'
import type { Invoice } from '../../types/invoice'

interface ReceivePurchaseModalProps {
  open: boolean
  onClose: () => void
  purchase: Invoice
}

type ShortfallAction = 'WAIT' | 'REFUND'

function outstandingOf(d: { quantity: number; received_quantity?: number; closed_quantity?: number }): number {
  return d.quantity - (d.closed_quantity ?? 0) - (d.received_quantity ?? 0)
}

// Persetujuan penerimaan oleh admin-warehouse gudang tujuan. Yang diisi di sini adalah jumlah yang
// benar-benar datang dan layak; hanya itu yang masuk stok. Sisanya: ditunggu penggantinya dari
// supplier (retur/penggantian), atau ditutup dan dananya diminta kembali.
export function ReceivePurchaseModal({ open, onClose, purchase }: ReceivePurchaseModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { getKey, reset } = useIdempotencyKey()
  const lines = (purchase.details ?? []).filter((d) => outstandingOf(d) > 0)
  const [received, setReceived] = useState<Record<number, string>>({})
  const [shortfallAction, setShortfallAction] = useState<ShortfallAction>('WAIT')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setReceived(Object.fromEntries(lines.map((d) => [d.item_id, String(outstandingOf(d))])))
      setShortfallAction('WAIT')
      setNotes('')
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id])

  const parsed = lines.map((d) => {
    const outstanding = outstandingOf(d)
    const value = Number(received[d.item_id] ?? '')
    const valid = Number.isInteger(value) && value >= 0 && value <= outstanding
    return { detail: d, outstanding, value: valid ? value : 0, valid }
  })
  const allValid = parsed.every((p) => p.valid)
  const totalReceived = parsed.reduce((sum, p) => sum + p.value, 0)
  const shortfallLines = parsed.filter((p) => p.outstanding - p.value > 0)
  const hasShortfall = shortfallLines.length > 0
  // Nilai kekurangan termasuk pajak, sama seperti penghitungan ulang total di server.
  const taxFactor = 1 + parseMoney(purchase.tax_rate ?? '0')
  const shortfallValue =
    shortfallLines.reduce((sum, p) => sum + (p.outstanding - p.value) * parseMoney(p.detail.unit_price), 0) * taxFactor

  const mutation = useMutation({
    mutationFn: () =>
      receivePurchase(
        purchase.id,
        {
          lines: parsed.map((p) => ({ item_id: p.detail.item_id, quantity: p.value })),
          shortfall_action: hasShortfall ? shortfallAction : undefined,
          notes: notes.trim() || null,
        },
        getKey(),
      ),
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      queryClient.invalidateQueries({ queryKey: ['stocks'] })
      queryClient.invalidateQueries({ queryKey: ['stock-mutations'] })
      queryClient.invalidateQueries({ queryKey: ['cost-layers'] })
      queryClient.invalidateQueries({ queryKey: ['cost-summary'] })
      queryClient.invalidateQueries({ queryKey: ['inbounds'] })
      toast.show('Penerimaan barang disetujui dan stok bertambah.', 'success')
      onClose()
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const canSubmit = allValid && totalReceived > 0 && !mutation.isPending

  return (
    <Modal open={open} onClose={onClose} title="Terima Barang">
      <p className="text-sm text-slate-600">
        Isi jumlah yang benar-benar diterima dan layak. Hanya jumlah ini yang masuk ke stok gudang.
      </p>

      <div className="mt-4 max-h-72 overflow-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Sisa</th>
              <th className="px-3 py-2 text-right">Diterima</th>
            </tr>
          </thead>
          <tbody>
            {parsed.map((p) => (
              <tr key={p.detail.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">{p.detail.name}</div>
                  <div className="text-xs text-slate-400">{p.detail.sku}</div>
                </td>
                <td className="px-3 py-2 text-right">{p.outstanding}</td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    max={p.outstanding}
                    value={received[p.detail.item_id] ?? ''}
                    onChange={(e) => setReceived((prev) => ({ ...prev, [p.detail.item_id]: e.target.value }))}
                    className={`w-24 rounded-md border px-2 py-1 text-right ${p.valid ? 'border-slate-300' : 'border-red-400'}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasShortfall && (
        <fieldset className="mt-4 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <legend className="px-1 text-xs font-semibold text-amber-800">Ada yang belum diterima — pilih tindak lanjut</legend>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="shortfall"
              checked={shortfallAction === 'WAIT'}
              onChange={() => setShortfallAction('WAIT')}
              className="mt-1"
            />
            <span>
              <strong>Tunggu pengganti dari supplier</strong> (retur/penggantian). Pembelian tetap terbuka dan bisa
              diterima lagi nanti.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="shortfall"
              checked={shortfallAction === 'REFUND'}
              onChange={() => setShortfallAction('REFUND')}
              className="mt-1"
            />
            <span>
              <strong>Tutup kekurangan dan minta dana dikembalikan</strong> — senilai sekitar{' '}
              <strong>{formatRupiah(shortfallValue)}</strong>. Pembelian ditandai selesai dengan jumlah yang
              diterima.
            </span>
          </label>
        </fieldset>
      )}

      <div className="mt-4">
        <TextareaField
          label="Catatan (opsional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="mis. 4 dus rusak, supplier kirim ulang minggu depan"
        />
      </div>

      {totalReceived === 0 && allValid && (
        <p className="mt-3 text-sm text-red-600">
          Minimal satu item harus diterima. Untuk menolak seluruh kiriman, batalkan pembelian ini.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Memproses...' : 'Setujui & Masukkan ke Stok'}
        </button>
      </div>
    </Modal>
  )
}
