import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { TextField } from '../../components/FormField'
import { StatCard } from '../../components/StatCard'
import { ReportActions, ReportPrintHeader } from '../../components/ReportActions'
import { getUnusualActivity } from '../../api/dashboard'
import { listWarehouses } from '../../api/warehouses'
import { listUsers } from '../../api/users'
import { formatNumber } from '../../utils/money'
import { downloadXlsx, reportFileName } from '../../utils/exportXlsx'
import { unusualActivitySheets } from './exportSheets'
import { daysAgoISO, formatDate, formatTimestamp, todayISO } from '../../utils/date'
import { ACTION_LABEL, ENTITY_LABEL, ENTITY_PATH, FINDING_TITLE } from './reportLabels'
import type { UnusualExample, UnusualFinding, UnusualFindingType } from '../../types/dashboard'
import { useI18n } from '../../i18n/useI18n'
import { translate } from '../../i18n/i18n'

// Aturan tiap jenis temuan, ditulis di kartu supaya jelas apa yang dihitung.
const FINDING_RULE: Record<UnusualFindingType, (t: Record<string, number>) => string> = {
  cancellations: (t) => translate('{cancellations} dokumen transaksi dibatalkan atau lebih oleh satu orang', { cancellations: t.cancellations }),
  deletions: (t) => translate('{deletions} data dihapus atau lebih oleh satu orang', { deletions: t.deletions }),
  night_activity: (t) =>
    translate('{night_activity} aksi transaksi atau lebih antara {v2}:00 dan {v3}:00 WIB', { night_activity: t.night_activity, v2: String(t.night_start_hour).padStart(2, '0'), v3: String(t.night_end_hour).padStart(2, '0') }),
  item_edits: (t) =>
    translate('{item_edits} perubahan item atau lebih oleh satu orang (log tidak mencatat bagian yang diubah, mis. harga)', { item_edits: t.item_edits }),
}

// Aktivitas Tidak Biasa — pola di log aktivitas yang layak dicek (pembatalan/penghapusan berulang,
// transaksi di malam hari, banyak perubahan item), dikelompokkan per orang. Sengaja netral: ini
// penanda untuk bertanya, bukan tuduhan, dan aturannya ditulis di tiap temuan.
export default function UnusualActivityPage() {
  const { t } = useI18n()
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
    { key: 'at', header: t('Waktu'), render: (row) => formatTimestamp(row.at) },
    { key: 'action', header: t('Aksi'), render: (row) => t(ACTION_LABEL[row.action] ?? row.action) },
    {
      key: 'entity',
      header: t('Data'),
      render: (row) => {
        const label = t(ENTITY_LABEL[row.entity_type] ?? row.entity_type)
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
    { key: 'warehouse', header: t('Cabang'), render: (row) => warehouseName(row.warehouse_id) },
  ]

  function FindingCard({ finding }: { finding: UnusualFinding }) {
        const high = finding.severity === 'high'
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {userName(finding.user_id)} — {t(FINDING_TITLE[finding.type])}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatNumber(finding.count)} {t('kali ·')} {warehouseName(finding.warehouse_id)} · {formatTimestamp(finding.first_at)}
              {finding.first_at !== finding.last_at && t(' sampai {v1}', { v1: formatTimestamp(finding.last_at) })}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              high ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {high ? t('Perlu perhatian') : t('Perlu dicek')}
          </span>
        </div>
        {finding.cancel_rate_pct != null && (
          <p className="mt-2 text-sm text-slate-600">
            {finding.cancel_rate_pct}{t('% dari')} {formatNumber(finding.documents_created ?? 0)} {t('dokumen yang dibuat orang ini pada periode yang sama dibatalkan.')}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {t('Aturan:')} {FINDING_RULE[finding.type](report?.thresholds ?? {})}.
          {finding.examples.length < finding.count && t(' Contoh {length} terbaru:', { length: finding.examples.length })}
        </p>
        <div className="mt-2">
          <DataTable columns={exampleColumns} data={finding.examples} getRowKey={(row) => `${row.at}-${row.entity_type}-${row.entity_id}-${row.action}`} />
        </div>
      </article>
    )
  }

  async function exportExcel() {
    if (!report) return
    await downloadXlsx(
      reportFileName('aktivitas-tidak-biasa', todayISO()),
      unusualActivitySheets(report, { warehouseName, userName }),
    )
  }

  return (
    <div>
      <ReportPrintHeader title={t('Aktivitas Tidak Biasa')} subtitle={t('Periode {v1} – {v2}', { v1: formatDate(from), v2: formatDate(to) })} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">{t('Aktivitas Tidak Biasa')}</h1>
          <p className="text-sm text-slate-500">
            {t('Pola di log aktivitas yang layak ditanyakan. Tidak biasa belum tentu salah: bisa saja ada alasan yang wajar.')}
          </p>
        </div>
        <ReportActions onExcel={exportExcel} disabled={!report} />
      </div>

      <FilterBar>
        <div className="w-40">
          <TextField label={t('Dari')} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label={t('Sampai')} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-2 pb-0.5">
          {[
            { label: t('7 hari'), days: 6 },
            { label: t('30 hari'), days: 29 },
            { label: t('90 hari'), days: 89 },
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

      {!rangeValid && <p className="mt-4 text-sm text-red-600">{t('Tanggal awal tidak boleh setelah tanggal akhir.')}</p>}

      {isError ? (
        <div className="mt-4">
          <ErrorState error={error} />
        </div>
      ) : (
        rangeValid && (
          <>
            <p className="mt-4 text-xs text-slate-500">
              {t('Periode')} {formatDate(report?.period.from ?? from)} – {formatDate(report?.period.to ?? to)}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label={t('Temuan')}
                value={report ? formatNumber(report.summary.findings) : '...'}
                tone={report && report.summary.findings > 0 ? 'warn' : 'default'}
              />
              <StatCard label={t('Orang terkait')} value={report ? formatNumber(report.summary.flagged_users) : '...'} />
              <StatCard
                label={t('Perlu perhatian')}
                value={report ? formatNumber(report.summary.high_severity) : '...'}
                hint={t('dua kali ambang atau lebih')}
                tone={report && report.summary.high_severity > 0 ? 'warn' : 'default'}
              />
              <StatCard
                label={t('Aktivitas malam')}
                value={report ? formatNumber(report.summary.by_type.night_activity) : '...'}
                hint={t('22:00–05:00 WIB')}
              />
            </div>

            {report?.summary.row_limit_reached && (
              <p className="mt-3 text-xs text-amber-700">
                {t('Log pada periode ini sangat banyak sehingga sebagian tidak terbaca; angka bisa lebih rendah dari sebenarnya. Persempit rentang tanggalnya.')}
              </p>
            )}

            <div className="mt-4 space-y-4">
              {isLoading && <p className="text-sm text-slate-400">{t('Memuat data...')}</p>}
              {report && report.findings.length === 0 && (
                <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  {t('Tidak ada pola tidak biasa pada periode ini.')}
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
