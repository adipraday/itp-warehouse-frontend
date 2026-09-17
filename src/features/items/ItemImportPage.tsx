import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { SelectField } from '../../components/FormField'
import { useToast } from '../../hooks/useToast'
import { usePermissions } from '../../auth/permissions'
import { ApiError, getErrorMessage } from '../../api/errors'
import { downloadBlob } from '../../utils/download'
import { downloadItemsImportTemplate, exportItems, importItems } from '../../api/items'
import type { ExportFormat } from '../../api/items'
import type { ImportValidationDetail, ItemImportResult } from '../../types/item'

/**
 * Import + export item (§25/§26 frontend-integration-guide.md, 2026-09-14). Halaman terpisah
 * dari `ItemListPage` (bukan modal) — cukup banyak konten penjelasan ("all-or-nothing",
 * "full replace", kolom export sengaja beda dari import) yang butuh ruang, dan bukan aksi cepat
 * sekali klik seperti modal-modal lain di app ini.
 */
export default function ItemImportPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { role } = usePermissions()
  // Import (§25) eksplisit nolak super-admin — `400 BU_REQUIRED`, karena tidak ada satu BU
  // tunggal yang jelas jadi tujuan import (super-admin lintas semua BU/company). Export TIDAK
  // punya pembatasan yang sama (tidak didokumentasikan), jadi section itu tetap tampil normal.
  const canImport = role !== 'super-admin'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ItemImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<ImportValidationDetail[] | null>(null)

  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [exportWarehouseId, setExportWarehouseId] = useState<number | null>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => importItems(file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['inbounds'] })
      setImportResult(res.data)
      setValidationErrors(null)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.show('Import berhasil.', 'success')
    },
    onError: (err) => {
      setImportResult(null)
      // Validasi per-baris ditampilkan sebagai tabel (§25: "jangan cuma tampilkan message di
      // level atas, detail per barisnya yang paling berguna") — bukan toast generik.
      if (err instanceof ApiError && err.code === 'IMPORT_VALIDATION_FAILED') {
        setValidationErrors(err.details as ImportValidationDetail[])
      } else {
        setValidationErrors(null)
        toast.show(getErrorMessage(err), 'error')
      }
    },
  })

  const templateMutation = useMutation({
    mutationFn: (format: ExportFormat) => downloadItemsImportTemplate(format),
    onSuccess: ({ blob, filename }, format) => {
      downloadBlob(blob, filename ?? `items-import-template.${format}`)
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  const exportMutation = useMutation({
    mutationFn: () => exportItems({ format: exportFormat, warehouse_id: exportWarehouseId ?? undefined }),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename ?? `items-export.${exportFormat}`)
      toast.show('Export berhasil diunduh.', 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
    setImportResult(null)
    setValidationErrors(null)
  }

  function handleImportSubmit() {
    if (!selectedFile) {
      toast.show('Pilih file CSV/.xlsx dulu.', 'error')
      return
    }
    importMutation.mutate(selectedFile)
  }

  return (
    <div>
      <Link to="/items" className="text-sm text-blue-600 hover:underline">
        &larr; Kembali ke daftar item
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold text-slate-900">Import & Export Item</h1>

      {!canImport && (
        <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Import butuh akun dengan BU tunggal (admin-bu/purchasing) — super-admin lintas semua BU
          jadi tidak ada tujuan import yang jelas. Bagian Export di bawah tetap bisa dipakai.
        </div>
      )}

      {canImport && (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Import Item + Stok Awal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload file CSV/.xlsx buat bikin atau update banyak item sekaligus — opsional langsung
          isi stok awal per warehouse (otomatis jadi dokumen Inbound COMPLETED, bukan angka yang
          muncul tanpa jejak). Maks 5000 baris, 10MB.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => templateMutation.mutate('csv')}
            disabled={templateMutation.isPending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Download Template CSV
          </button>
          <button
            type="button"
            onClick={() => templateMutation.mutate('xlsx')}
            disabled={templateMutation.isPending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Download Template XLSX
          </button>
        </div>

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Penting sebelum upload:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Ada 1 baris aja yang salah → SELURUH file ditolak, tidak ada yang ke-import sebagian.</li>
            <li>
              Update ke item yang sudah ada itu <strong>full replace</strong> — kolom yang
              dikosongkan di file akan ikut ter-reset ke default, bukan dibiarkan seperti semula.
            </li>
            <li>Satu SKU cuma boleh muncul sekali per file.</li>
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!selectedFile || importMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importMutation.isPending ? 'Mengimpor...' : 'Upload & Import'}
          </button>
        </div>

        {importResult && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p className="font-medium">Import berhasil:</p>
            <ul className="mt-1 space-y-0.5">
              <li>{importResult.rows_processed} baris diproses</li>
              <li>{importResult.items_created} item baru dibuat</li>
              <li>{importResult.items_updated} item di-update</li>
              <li>{importResult.warehouses_stocked} warehouse ke-isi stok</li>
            </ul>
            {importResult.inbound_ids.length > 0 && (
              <p className="mt-2">
                Dokumen inbound yang otomatis dibuat:{' '}
                {importResult.inbound_ids.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    <Link to={`/inbounds/${id}`} className="underline">
                      #{id}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        {validationErrors && validationErrors.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-red-700">
              {validationErrors.length} baris gagal validasi — perbaiki file lalu upload ulang
              dari awal (tidak ada yang ke-import sebagian).
            </p>
            <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      No. Baris
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pesan Error
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {validationErrors.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-700">{d.row}</td>
                      <td className="px-3 py-2 text-slate-700">{d.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Export Item</h2>
        <p className="mt-1 text-sm text-slate-500">
          Unduh data item saat ini — kolom-nya sengaja beda dari kolom Import (tidak ada{' '}
          <code>quantity</code>/<code>unit_cost</code>), jadi export-lalu-reimport-langsung
          <strong> aman</strong>, tidak bikin stok dobel keitung.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2">
          <SelectField
            label="Format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
          </SelectField>
          <WarehouseSelect
            label="Warehouse (opsional)"
            placeholder="Semua warehouse"
            value={exportWarehouseId}
            onChange={setExportWarehouseId}
          />
        </div>

        <button
          type="button"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {exportMutation.isPending ? 'Mengunduh...' : 'Export'}
        </button>

        {exportWarehouseId != null && (
          <p className="mt-2 text-xs text-slate-400">
            Kolom stok di file ini ("Stok Saat Ini") cuma buat referensi — namanya sengaja beda
            dari kolom yang dikenali Import, jadi tetap aman kalau file ini di-upload balik tanpa
            diedit.
          </p>
        )}
      </div>
    </div>
  )
}
