import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextField, TextareaField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { addCashSessionExpense } from '../../api/cashSessions'

interface CashSessionExpenseModalProps {
  open: boolean
  onClose: () => void
  sessionId: number
}

/**
 * Kas Keluar (§20 frontend-integration-guide.md, 2026-09-13) — uang yang keluar dari laci buat
 * keperluan operasional (beli galon air, ongkos kirim dadakan, dll), dicatat SEBELUM uangnya
 * beneran diambil. `description` wajib — tanpa alasan tercatat, fitur ini kehilangan gunanya
 * sebagai audit trail (backend juga menolaknya kalau kosong).
 */
export function CashSessionExpenseModal({ open, onClose, sessionId }: CashSessionExpenseModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setAmount('')
      setDescription('')
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: () => addCashSessionExpense(sessionId, { amount: Number(amount) || 0, description: description.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions', 'current'] })
      toast.show('Pengeluaran dicatat.', 'success')
      onClose()
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amountNum = Number(amount) || 0
    if (amountNum <= 0) {
      toast.show('Jumlah pengeluaran harus lebih dari 0.', 'error')
      return
    }
    if (!description.trim()) {
      toast.show('Alasan pengeluaran wajib diisi.', 'error')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Catat Pengeluaran (Kas Keluar)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Jumlah"
          type="number"
          min={0}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <TextareaField
          label="Alasan"
          required
          placeholder="mis. Beli galon air"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Catat'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
