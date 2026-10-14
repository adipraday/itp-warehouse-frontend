import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextField, SelectField, TextareaField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { todayISO } from '../../utils/date'
import { formatRupiah } from '../../utils/money'
import { recordPurchaseRefund } from '../../api/purchases'
import { PAYMENT_METHODS } from '../../types/payment'

interface PurchaseRefundModalProps {
  open: boolean
  onClose: () => void
  purchaseId: number
  refundDue: number
}

// Mencatat uang yang benar-benar kembali dari supplier. Jumlahnya tidak boleh melebihi sisa
// pengembalian yang masih terutang (backend juga menolak 409 AMOUNT_EXCEEDS_REFUND_DUE).
export function PurchaseRefundModal({ open, onClose, purchaseId, refundDue }: PurchaseRefundModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('TRANSFER')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(refundDue > 0 ? String(refundDue) : '')
      setMethod('TRANSFER')
      setDate(todayISO())
      setNotes('')
    }
  }, [open, refundDue])

  const amountNum = Number(amount) || 0
  const valid = amountNum > 0 && amountNum <= refundDue + 0.005

  const mutation = useMutation({
    mutationFn: () =>
      recordPurchaseRefund(purchaseId, {
        amount: amountNum,
        refund_method: method,
        refund_date: date,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      toast.show('Pengembalian dana dicatat.', 'success')
      onClose()
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Catat Pengembalian Dana">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Sisa yang harus dikembalikan supplier: <strong>{formatRupiah(refundDue)}</strong>
        </p>
        <TextField
          label="Jumlah diterima kembali (Rp)"
          type="number"
          min={1}
          max={refundDue}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <SelectField label="Metode" value={method} onChange={(e) => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Tanggal" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <TextareaField label="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!valid || mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
