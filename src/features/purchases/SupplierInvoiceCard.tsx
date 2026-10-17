import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import {
  deleteSupplierInvoiceFile,
  downloadSupplierInvoiceFile,
  updateSupplierInvoiceNumber,
  uploadSupplierInvoiceFile,
} from '../../api/purchases'
import type { Invoice } from '../../types/invoice'
import { validateSupplierInvoiceFile } from './supplierInvoiceFile'
import { useI18n } from '../../i18n/useI18n'

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

interface SupplierInvoiceCardProps {
  purchase: Invoice
  // Boleh mengubah nomor/berkas: peran penulis pembelian, dan pembelian belum dibatalkan.
  canEdit: boolean
}

// Nomor invoice asli dari supplier (opsional) + salinan PDF-nya. Berkas disimpan di Cloudflare R2
// lewat API; browser tidak pernah mengakses bucket langsung, jadi PDF diambil lewat API
// ber-token lalu dibuka dari blob.
export function SupplierInvoiceCard({ purchase, canEdit }: SupplierInvoiceCardProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [number, setNumber] = useState(purchase.supplier_invoice_number ?? '')

  useEffect(() => {
    setNumber(purchase.supplier_invoice_number ?? '')
  }, [purchase.supplier_invoice_number])

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['purchase'] })
  }

  const saveNumber = useMutation({
    mutationFn: () => updateSupplierInvoiceNumber(purchase.id, number.trim() || null),
    onSuccess: () => {
      refresh()
      toast.show(t('Nomor invoice supplier disimpan.'), 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const upload = useMutation({
    mutationFn: (file: File) => uploadSupplierInvoiceFile(purchase.id, file),
    onSuccess: () => {
      refresh()
      toast.show(t('PDF invoice supplier tersimpan.'), 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const remove = useMutation({
    mutationFn: () => deleteSupplierInvoiceFile(purchase.id),
    onSuccess: () => {
      refresh()
      toast.show(t('PDF invoice supplier dihapus.'), 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const open = useMutation({
    mutationFn: () => downloadSupplierInvoiceFile(purchase.id),
    onSuccess: ({ blob }) => {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Beri waktu tab baru memuat sebelum URL dilepas.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  function handleFile(file: File | undefined) {
    if (!file) return
    const problem = validateSupplierInvoiceFile(file)
    if (problem) {
      toast.show(problem, 'error')
      return
    }
    upload.mutate(file)
  }

  const hasFile = !!purchase.has_supplier_invoice_file
  const numberChanged = number.trim() !== (purchase.supplier_invoice_number ?? '')

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 print:hidden">
      <h2 className="text-sm font-semibold text-slate-700">{t('Invoice dari Supplier')}</h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">{t('No. invoice supplier (opsional)')}</label>
          {canEdit ? (
            <div className="mt-1 flex gap-2">
              <input
                value={number}
                maxLength={100}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={t('mis. INV/2026/10/0042')}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={!numberChanged || saveNumber.isPending}
                onClick={() => saveNumber.mutate()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('Simpan')}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-800">{purchase.supplier_invoice_number || '-'}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">{t('Dokumen PDF invoice asli')}</label>
          {hasFile ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-800">{purchase.supplier_invoice_file_name}</span>
              {purchase.supplier_invoice_file_size != null && (
                <span className="text-slate-400">({formatSize(purchase.supplier_invoice_file_size)})</span>
              )}
              <button
                type="button"
                onClick={() => open.mutate()}
                disabled={open.isPending}
                className="text-blue-600 hover:underline disabled:opacity-50"
              >
                {open.isPending ? t('Membuka...') : t('Lihat')}
              </button>
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={upload.isPending}
                    className="text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {t('Ganti')}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate()}
                    disabled={remove.isPending}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    {t('Hapus')}
                  </button>
                </>
              )}
            </div>
          ) : canEdit ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
              className="mt-1 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {upload.isPending ? t('Mengunggah...') : t('Unggah PDF (maks. 10 MB)')}
            </button>
          ) : (
            <p className="mt-1 text-sm text-slate-400">{t('Belum ada dokumen.')}</p>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}
