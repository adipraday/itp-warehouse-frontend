import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { TextareaField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { cancelPurchase } from '../../api/purchases'
import { formatRupiah, parseMoney } from '../../utils/money'
import type { Invoice } from '../../types/invoice'
import { useI18n } from '../../i18n/useI18n'

interface CancelPurchaseModalProps {
  open: boolean
  onClose: () => void
  purchase: Invoice
}

// Membatalkan pembelian. Yang belum dibayar dan belum diajukan langsung dibatalkan; yang sudah
// dibayar atau sudah diajukan ke gudang wajib beralasan, dan seluruh dana yang sudah dibayar
// (dikurangi nilai barang yang sudah diterima) menjadi pengembalian dana dari supplier.
export function CancelPurchaseModal({ open, onClose, purchase }: CancelPurchaseModalProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const paid = parseMoney(purchase.paid_amount ?? '0')
  const needsReason = paid > 0 || !!purchase.receipt_status
  const partlyReceived = purchase.receipt_status === 'PARTIALLY_RECEIVED'

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const mutation = useMutation({
    mutationFn: () => cancelPurchase(purchase.id, reason.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      toast.show(partlyReceived ? t('Sisa pembelian dibatalkan.') : t('Pembelian dibatalkan.'), 'success')
      onClose()
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  return (
    <Modal open={open} onClose={onClose} title={partlyReceived ? t('Batalkan Sisa Pembelian') : t('Batalkan Pembelian')}>
      <p className="text-sm text-slate-600">
        {partlyReceived
          ? t('Barang yang sudah diterima tetap di stok. Sisa yang belum datang dibatalkan dan pembelian ditandai selesai.')
          : t('Pembelian ini akan dibatalkan.')}
      </p>
      {paid > 0 && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('Pembelian ini sudah dibayar')} {formatRupiah(paid)}{t('. Dana yang tidak terpakai menjadi')}{' '}
          <strong>{t('pengembalian dana dari supplier')}</strong> {t('dan bisa dicatat setelah uangnya kembali.')}
        </p>
      )}
      <div className="mt-4">
        <TextareaField
          label={needsReason ? t('Alasan pembatalan (wajib)') : t('Alasan (opsional)')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('mis. supplier tidak bisa memenuhi pesanan')}
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {t('Kembali')}
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || (needsReason && !reason.trim())}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {mutation.isPending ? t('Memproses...') : t('Batalkan')}
        </button>
      </div>
    </Modal>
  )
}
