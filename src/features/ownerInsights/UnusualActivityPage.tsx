import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { TextField } from '../../components/FormField'
import { StatCard } from '../../components/StatCard'
import { getUnusualActivity } from '../../api/dashboard'
import { listWarehouses } from '../../api/warehouses'
import { listUsers } from '../../api/users'
import { formatNumber } from '../../utils/money'
import { daysAgoISO, formatDate, formatTimestamp, todayISO } from '../../utils/date'
import type { UnusualExample, UnusualFinding, UnusualFindingType } from '../../types/dashboard'

const FINDING_INFO: Record<UnusualFindingType, { title: string; rule: (t: Record<string, number>) => string }> = {
  cancellations: {
    title: 'Pembatalan dokumen berulang',
    rule: (t) => `${t.cancellations} dokumen transaksi dibatalkan atau lebih oleh satu orang`,
  },
  deletions: {
    title: 'Penghapusan data berulang',
    rule: (t) => `${t.deletions} data dihapus atau lebih oleh satu orang`,
  },
  night_activity: {
    title: 'Aktivitas transaksi di malam hari',
    rule: (t) =>
      `${t.night_activity} aksi transaksi atau lebih antara ${String(t.night_start_hour).padStart(2, '0')}:00 dan ${String(t.night_end_hour).padStart(2, '0')}:00 WIB`,
  },
  item_edits: {
    title: 'Banyak perubahan data item',
    rule: (t) => `${t.item_edits} perubahan item atau lebih oleh satu orang (log tidak mencatat bagian yang diubah, mis. harga)`,
  },
}

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Dibuat',
  UPDATE: 'Diubah',
  DELETE: 'Dihapus',
  CANCEL: 'Dibatalkan',
  COMPLETE: 'Diselesaikan',
  APPROVE: 'Disetujui',
  SUBMIT: 'Diajukan',
  REJECT: 'Ditolak',
  HOLD: 'Ditahan',
  RESUME: 'Dilanjutkan',
}

const ENTITY_LABEL: Record<string, string> = {
  SALE: 'Penjualan',
  PURCHASE: 'Pembelian',
  INBOUND: 'Barang masuk',
  OUTBOUND: 'Barang keluar',
  STOCK_TRANSFER: 'Transfer',
  STOCK_OPNAME: 'Stok opname',
  RETURN: 'Retur',
  PAYMENT: 'Pembayaran',
  ITEM: 'Item',
  CONTACT: 'Kontak',
  WAREHOUSE: 'Warehouse',
}

// Halaman detail per jenis dokumen; jenis tanpa halaman detail (pembayaran, kontak) tidak ditautkan.
const ENTITY_PATH: Record<string, (id: number) => string> = {
  SALE: (id) => `/sales/${id}`,
  PURCHASE: (id) => `/purchases/${id}`,
  INBOUND: (id) => `/inbounds/${id}`,
  OUTBOUND: (id) => `/outbounds/${id}`,
  STOCK_TRANSFER: (id) => `/stock-transfers/${id}`,
  STOCK_OPNAME: (id) => `/stock-opnames/${id}`,
  RETURN: (id) => `/returns/${id}`,
  ITEM: (id) => `/items/${id}`,
  WAREHOUSE: (id) => `/warehouses/${id}`,
}

// Aktivitas Tidak Biasa — pola di log aktivitas yang layak dicek (pembatalan/penghapusan berulang,
// transaksi di malam hari, banyak perubahan item), dikelompokkan per orang. Sengaja netral: ini
// penanda untuk bertanya, bukan tuduhan, dan aturannya ditulis di tiap temuan.
export default function UnusualActivityPage() {
  const [from, setFrom] = useState(daysAgoISO(6))
  const [to, setTo] = useState(todayISO())

  const rangeValid = from !== '' && to !== '' && from <= to
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-unusual-activity', from, to],
    queryFn: () => getUnusualActivity({ from, to }),
    enabled: rangeValid,
  })
  const report = data?.data

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'all', 'assigned'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100, scope: 'assigned' }),
    retry: false,
  })
  const warehouseName = (id: number | null) =>
    id == null ? '—' : (warehousesData?.data.find((w) => w.id === id)?.name ?? `Warehouse #${id}`)

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all-for-cash-session-history'],
    queryFn: () => listUsers({ page: 1, per_page: 100 }),
    retry: false,
  })
  const userName = (id: number) => usersData?.users.find((u) => u.id === id)?.name ?? `User #${id}`

  const exampleColumns: DataTableColumn<UnusualExample>[] = [
    { key: 'at', header: 'Waktu', render: (row) => formatTimestamp(row.at) },
    { key: 'action', header: 'Aksi', render: (row) => ACTION_LABEL[row.action] ?? row.action },
    {
      key: 'entity',
      header: 'Data',
      render: (row) => {
        const label = ENTITY_LABEL[row.entity_type] ?? row.entity_type
        const path = ENTITY_PATH[row.entity_type]
        // Data yang sudah dihapus tidak punya halaman lagi.
        if (row.entity_id == null || !path || row.action === 'DELETE') {
          return `${label}${row.entity_id == null ? '' : ` #${row.entity_id}`}`
        }
        return (
          <Link to={path(row.entity_id)} className="text-blue-600 hover:underline">
            {label} #{row.entity_id}
          </Link>
        )
      },
    },
    { key: 'warehouse', header: 'Cabang', render: (row) => warehouseName(row.warehouse_id) },
  ]

  function FindingCard({ finding }: { finding: UnusualFinding }) {
    const info = FINDING_INFO[finding.type]
    const high = finding.severity === 'high'
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {userName(finding.user_id)} — {info.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatNumber(finding.count)} kali · {warehouseName(finding.warehouse_id)} · {formatTimestamp(finding.first_at)}
              {finding.first_at !== finding.last_at && ` sampai ${formatTimestamp(finding.last_at)}`}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              high ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {high ? 'Perlu perhatian' : 'Perlu dicek'}
          </span>
        </div>
        {finding.cancel_rate_pct != null && (
          <p className="mt-2 text-sm text-slate-600">
            {finding.cancel_rate_pct}% dari {formatNumber(finding.documents_created ?? 0)} dokumen yang dibuat orang ini pada
            periode yang sama dibatalkan.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Aturan: {info.rule(report?.thresholds ?? {})}.
          {finding.examples.length < finding.count && ` Contoh ${finding.examples.length} terbaru:`}
        </p>
        <div className="mt-2">
          <DataTable columns={exampleColumns} data={finding.examples} getRowKey={(row) => `${row.at}-${row.entity_type}-${row.entity_id}-${row.action}`} />
        </div>
      </article>
    )
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Aktivitas Tidak Biasa</h1>
      <p className="mb-6 text-sm text-slate-500">
        Pola di log aktivitas yang layak ditanyakan. Tidak biasa belum tentu salah: bisa saja ada alasan yang wajar.
      </p>

      <FilterBar>
        <div className="w-40">
          <TextField label="Dari" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label="Sampai" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-2 pb-0.5">
          {[
            { label: '7 hari', days: 6 },
            { label: '30 hari', days: 29 },
            { label: '90 hari', days: 89 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setFrom(daysAgoISO(preset.days))
                setTo(todayISO())
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </FilterBar>

      {!rangeValid && <p className="mt-4 text-sm text-red-600">Tanggal awal tidak boleh setelah tanggal akhir.</p>}

      {isError ? (
        <div className="mt-4">
          <ErrorState error={error} />
        </div>
      ) : (
        rangeValid && (
          <>
            <p className="mt-4 text-xs text-slate-500">
              Periode {formatDate(report?.period.from ?? from)} – {formatDate(report?.period.to ?? to)}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Temuan"
                value={report ? formatNumber(report.summary.findings) : '...'}
                tone={report && report.summary.findings > 0 ? 'warn' : 'default'}
              />
              <StatCard label="Orang terkait" value={report ? formatNumber(report.summary.flagged_users) : '...'} />
              <StatCard
                label="Perlu perhatian"
                value={report ? formatNumber(report.summary.high_severity) : '...'}
                hint="dua kali ambang atau lebih"
                tone={report && report.summary.high_severity > 0 ? 'warn' : 'default'}
              />
              <StatCard
                label="Aktivitas malam"
                value={report ? formatNumber(report.summary.by_type.night_activity) : '...'}
                hint="22:00–05:00 WIB"
              />
            </div>

            {report?.summary.row_limit_reached && (
              <p className="mt-3 text-xs text-amber-700">
                Log pada periode ini sangat banyak sehingga sebagian tidak terbaca; angka bisa lebih rendah dari sebenarnya.
                Persempit rentang tanggalnya.
              </p>
            )}

            <div className="mt-4 space-y-4">
              {isLoading && <p className="text-sm text-slate-400">Memuat data...</p>}
              {report && report.findings.length === 0 && (
                <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  Tidak ada pola tidak biasa pada periode ini.
                </p>
              )}
              {report?.findings.map((finding) => (
                <FindingCard key={`${finding.type}-${finding.user_id}`} finding={finding} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  )
}
