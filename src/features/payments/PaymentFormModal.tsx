import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextField, SelectField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { todayISO } from '../../utils/date'
import { formatRupiah, parseMoney } from '../../utils/money'
import { createPayment } from '../../api/payments'
import { PAYMENT_METHODS } from '../../types/payment'
import type { PaymentMethod } from '../../types/payment'
import type { InvoiceKind } from '../../api/invoices'
import { useI18n } from '../../i18n/useI18n'

interface PaymentFormModalProps {
  open: boolean
  onClose: () => void
  invoiceId: number
  remainingBalance: number
  // 'purchase' = bayar ke supplier (uang KELUAR): tidak ada "uang diterima"/"kembalian" — itu
  // istilah kasir yang menerima uang dari pelanggan. Default 'sales' (perilaku lama).
  kind?: InvoiceKind
}

export function PaymentFormModal({ open, onClose, invoiceId, remainingBalance, kind = 'sales' }: PaymentFormModalProps) {
  const { t } = useI18n()
  const isPurchase = kind === 'purchase'
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  // Uang tunai diterima — cuma relevan buat CASH (§21 frontend-integration-guide.md, 2026-09-13).
  // Defaultnya disamain dengan `amount` (kasir tinggal Enter kalau pelanggan bayar pas), diedit
  // manual kalau pelanggan kasih uang lebih besar.
  const [amountTendered, setAmountTendered] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      const defaultAmount = remainingBalance > 0 ? String(remainingBalance) : ''
      setAmount(defaultAmount)
      setPaymentMethod('')
      setAmountTendered(defaultAmount)
      setPaymentDate(todayISO())
      setNotes('')
    }
  }, [open, remainingBalance])

  const isCash = paymentMethod === 'CASH'
  // Field uang diterima + kembalian cuma buat tunai di penjualan; di pembelian selalu dilewati.
  const showTendered = isCash && !isPurchase
  const amountNum = Number(amount) || 0
  const amountTenderedNum = Number(amountTendered) || 0
  // Preview kembalian di frontend cuma buat UX (kasir bisa konfirmasi dulu sebelum submit) — server
  // tetap sumber kebenaran akhir lewat `change_amount` di response (dipakai buat pesan sukses di bawah).
  const changePreview = showTendered ? Math.max(amountTenderedNum - amountNum, 0) : 0

  const mutation = useMutation({
    mutationFn: () =>
      createPayment({
        invoice_id: invoiceId,
        amount: amountNum,
        payment_method: paymentMethod as PaymentMethod,
        // Metode selain CASH: samain dengan `amount` (tidak ada konsep "kembalian" di luar tunai
        // fisik — QRIS/transfer/dst selalu pas per definisi).
        amount_tendered: showTendered ? amountTenderedNum : amountNum,
        payment_date: paymentDate,
        notes: notes.trim() || null,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      const change = parseMoney(res.data.change_amount)
      toast.show(
        change > 0
          ? t('Pembayaran berhasil dicatat. Kembalian: {v1}.', { v1: formatRupiah(change) })
          : t('Pembayaran berhasil dicatat.'),
        'success',
      )
      onClose()
    },
    onError: (err) => {
      toast.show(getErrorMessage(err), 'error')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (amountNum <= 0) {
      toast.show(t('Jumlah pembayaran harus lebih dari 0.'), 'error')
      return
    }
    if (amountNum > remainingBalance) {
      toast.show(t('Jumlah pembayaran melebihi sisa tagihan ({v1}).', { v1: formatRupiah(remainingBalance) }), 'error')
      return
    }
    if (!paymentMethod) {
      toast.show(t('Metode pembayaran wajib dipilih.'), 'error')
      return
    }
    if (showTendered && amountTenderedNum < amountNum) {
      toast.show(t('Uang diterima tidak boleh kurang dari jumlah pembayaran.'), 'error')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('Catat Pembayaran')}>
      <p className="mb-4 text-sm text-slate-500">
        {t('Sisa tagihan:')} <strong>{formatRupiah(remainingBalance)}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={isPurchase ? t('Uang Dikeluarkan') : t('Jumlah')}
          type="number"
          min={0}
          max={remainingBalance}
          required
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            // Kalau kasir belum sempat ubah "uang diterima" manual, ikutin biar tetap konsisten
            // (khas kasus ganti nominal tagihan sebelum kasir pegang uangnya).
            if (amountTendered === '' || Number(amountTendered) === amountNum) {
              setAmountTendered(e.target.value)
            }
          }}
        />
        <SelectField
          label={t('Metode Pembayaran')}
          required
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          <option value="">{t('-- pilih metode --')}</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {t(m.label)}
            </option>
          ))}
        </SelectField>
        {showTendered && (
          <>
            <TextField
              label={t('Uang Diterima')}
              type="number"
              min={amountNum}
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
            />
            {changePreview > 0 && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {t('Kembalian:')} {formatRupiah(changePreview)}
              </p>
            )}
          </>
        )}
        <TextField
          label={t('Tanggal Pembayaran')}
          type="date"
          required
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
        <TextField label={t('Catatan')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('Batal')}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? t('Menyimpan...') : t('Simpan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
