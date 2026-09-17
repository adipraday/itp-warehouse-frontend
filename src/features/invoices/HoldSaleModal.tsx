import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { holdSale } from '../../api/invoices'

interface HoldSaleModalProps {
  open: boolean
  onClose: () => void
  saleId: number
}

/**
 * Nahan sale DRAFT tanpa kehilangan cart-nya (§22 frontend-integration-guide.md, 2026-09-13) —
 * SALES-only. `hold_label` opsional (mis. nomor meja/nama pelanggan) biar gampang dikenali lagi
 * di daftar "Transaksi Tertahan". Sale-nya TETAP DRAFT setelah ini, cuma dapat penanda
 * `held_at`/`hold_label` — bukan transisi status baru.
 */
export function HoldSaleModal({ open, onClose, saleId }: HoldSaleModalProps) {
  const [holdLabel, setHoldLabel] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  useEffect(() => {
    if (open) setHoldLabel('')
  }, [open])

  const mutation = useMutation({
    mutationFn: () => holdSale(saleId, holdLabel.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', saleId] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      toast.show('Transaksi ditahan.', 'success')
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
    <Modal open={open} onClose={onClose} title="Tahan Transaksi">
      <p className="mb-4 text-sm text-slate-500">
        Cart transaksi ini akan ditahan (tetap DRAFT) — bisa dilanjutkan kapan saja lewat tombol
        "Lanjutkan".
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Label (opsional)"
          placeholder="mis. Meja 5, atau nama pelanggan"
          maxLength={100}
          value={holdLabel}
          onChange={(e) => setHoldLabel(e.target.value)}
        />
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
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Tahan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
