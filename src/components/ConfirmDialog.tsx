import { Modal } from './Modal'
import { useI18n } from '../i18n/useI18n'
import { tk } from '../i18n/i18n'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Dipakai untuk semua aksi ireversibel (complete/approve/cancel/delete/reject)
 * supaya user tidak salah klik pada aksi yang berdampak stok.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = tk('Konfirmasi'),
  cancelLabel = tk('Batal'),
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n()
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {description && <p className="text-sm text-slate-600">{t(description)}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {t(cancelLabel)}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? t('Memproses...') : t(confirmLabel)}
        </button>
      </div>
    </Modal>
  )
}
