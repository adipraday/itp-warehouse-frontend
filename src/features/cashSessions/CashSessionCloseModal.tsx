import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextField, TextareaField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { formatRupiah } from '../../utils/money'
import { closeCashSession } from '../../api/cashSessions'
import type { CashSession } from '../../types/cashSession'

interface CashSessionCloseModalProps {
  open: boolean
  onClose: () => void
  sessionId: number
  // Preview "kalau ditutup sekarang" (§20) — dari `summary.live_expected_cash` sesi yang lagi
  // aktif, dipakai buat hitung selisih live sebelum kasir beneran submit hasil hitung fisiknya.
  liveExpectedCash: number
  onClosed: (session: CashSession) => void
}

/**
 * Tutup kasir (§20 frontend-integration-guide.md, 2026-09-13) — kasir hitung fisik uang di laci,
 * input hasilnya. `cash_difference` dari response backend yang jadi sumber kebenaran akhir
 * (negatif = kasir kurang/defisit, positif = lebih) — diteruskan ke parent lewat `onClosed` biar
 * bisa ditampilkan sebagai laporan penutupan (Z-report) setelah modal ini ketutup.
 */
export function CashSessionCloseModal({
  open,
  onClose,
  sessionId,
  liveExpectedCash,
  onClosed,
}: CashSessionCloseModalProps) {
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setClosingAmount(String(liveExpectedCash))
      setNotes('')
    }
  }, [open, liveExpectedCash])

  const closingNum = Number(closingAmount) || 0
  const diffPreview = closingNum - liveExpectedCash

  const mutation = useMutation({
    mutationFn: () => closeCashSession(sessionId, { closing_amount: closingNum, notes: notes.trim() || null }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions', 'current'] })
      toast.show('Sesi kasir ditutup.', 'success')
      onClosed(res.data)
      onClose()
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Tutup Kasir">
      <p className="mb-4 text-sm text-slate-500">
        Hitung fisik uang tunai di laci saat ini, lalu masukkan hasilnya di bawah. Uang seharusnya
        (modal awal + kas masuk − pengeluaran): <strong>{formatRupiah(liveExpectedCash)}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Hasil Hitung Fisik (Uang Tunai)"
          type="number"
          min={0}
          required
          value={closingAmount}
          onChange={(e) => setClosingAmount(e.target.value)}
        />
        {closingAmount !== '' && (
          <p className={`text-sm font-medium ${diffPreview === 0 ? 'text-slate-600' : diffPreview > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            Selisih: {diffPreview > 0 ? '+' : ''}
            {formatRupiah(diffPreview)}
            {diffPreview !== 0 && (diffPreview > 0 ? ' (lebih)' : ' (kurang)')}
          </p>
        )}
        <TextareaField label="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Menutup...' : 'Tutup Kasir'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
