import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { SelectField, TextField } from '../../components/FormField'
import { SimpleBarChart } from '../../components/SimpleBarChart'
import { StatCard } from '../../components/StatCard'
import { BuLabel } from '../../components/BuLabel'
import { ReportActions, ReportPrintHeader } from '../../components/ReportActions'
import { getBranchComparison } from '../../api/dashboard'
import { usePermissions } from '../../auth/permissions'
import { formatNumber, formatRupiah, parseMoney } from '../../utils/money'
import { daysAgoISO, formatDate, todayISO } from '../../utils/date'
import { hasMultipleBuIds } from '../../utils/bu'
import { downloadXlsx, reportFileName } from '../../utils/exportXlsx'
import { branchComparisonSheets } from './exportSheets'
import type { BranchPerformance } from '../../types/dashboard'
import { useI18n } from '../../i18n/useI18n'
import { tk } from '../../i18n/i18n'

type SortKey = 'sales_total' | 'gross_margin_pct' | 'sales_growth_pct' | 'stock_alerts'

const SORT_LABEL: Record<SortKey, string> = {
  sales_total: tk('Penjualan terbesar'),
  gross_margin_pct: tk('Margin tertinggi'),
  sales_growth_pct: tk('Pertumbuhan tertinggi'),
  stock_alerts: tk('Stok kritis terbanyak'),
}

function sortValue(row: BranchPerformance, key: SortKey): number {
  switch (key) {
    case 'sales_total':
      return parseMoney(row.sales_total)
    case 'gross_margin_pct':
      return row.gross_margin_pct
    // Cabang tanpa pembanding (periode lalu kosong) ditaruh paling bawah, bukan dianggap 0%.
    case 'sales_growth_pct':
      return row.sales_growth_pct ?? Number.NEGATIVE_INFINITY
    case 'stock_alerts':
      return row.low_stock_count + row.out_of_stock_count
  }
}

// Teks + panah, bukan warna saja — naik/turun tetap terbaca tanpa membedakan warna.
function Growth({ pct }: { pct: number | null }) {
  const { t } = useI18n()
  if (pct == null) return <span className="text-slate-400">{t('Belum ada pembanding')}</span>
  if (pct === 0) return <span className="text-slate-500">{t('Sama dengan periode lalu')}</span>
  const up = pct > 0
  return (
    <span className={up ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}>
      {up ? t('▲ naik') : t('▼ turun')} {Math.abs(pct)}%
    </span>
  )
}

// Perbandingan Cabang — satu tabel untuk semua warehouse yang boleh dilihat user (owner: seluruh
// BU perusahaannya). Datanya satu panggilan `GET /dashboard/branches`; periode pembanding
// (rentang sama panjang tepat sebelum rentang terpilih) dihitung backend.
export default function BranchComparisonPage() {
  const { t } = useI18n()
  const { canViewHpp } = usePermissions()
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(todayISO())
  const [sortKey, setSortKey] = useState<SortKey>('sales_total')

  const rangeValid = from !== '' && to !== '' && from <= to
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-branches', from, to],
    queryFn: () => getBranchComparison({ from, to }),
    enabled: rangeValid,
  })

  const comparison = data?.data
  const branches = [...(comparison?.branches ?? [])].sort(
    (a, b) => sortValue(b, sortKey) - sortValue(a, sortKey) || a.warehouse_id - b.warehouse_id,
  )
  const showBu = hasMultipleBuIds(branches)
  const totals = comparison?.totals

  const columns: DataTableColumn<BranchPerformance>[] = [
    { key: 'rank', header: '#', render: (row) => branches.indexOf(row) + 1 },
    {
      key: 'name',
      header: t('Cabang'),
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-400">{row.code}</p>
        </div>
      ),
    },
    ...(showBu
      ? [{ key: 'bu_id', header: t('BU'), render: (row: BranchPerformance) => <BuLabel buId={row.bu_id} /> }]
      : []),
    {
      key: 'sales_total',
      header: t('Penjualan'),
      className: 'text-right',
      render: (row) => (
        <div>
          <p className="font-mono">{formatRupiah(row.sales_total)}</p>
          <p className="text-xs text-slate-400">{formatNumber(row.sales_count)} {t('transaksi')}</p>
        </div>
      ),
    },
    {
      key: 'growth',
      header: t('Dibanding periode lalu'),
      render: (row) => <Growth pct={row.sales_growth_pct} />,
    },
    ...(canViewHpp()
      ? [
          {
            key: 'margin',
            header: t('Margin'),
            className: 'text-right',
            render: (row: BranchPerformance) => (
              <div>
                <p className="font-mono">{row.gross_margin_pct}%</p>
                <p className="text-xs text-slate-400">{formatRupiah(row.gross_profit)}</p>
              </div>
            ),
          },
        ]
      : []),
    { key: 'stock_value', header: t('Nilai Stok'), className: 'text-right', render: (row) => formatRupiah(row.stock_value) },
    {
      key: 'stock_alerts',
      header: t('Stok Kritis'),
      render: (row) =>
        row.low_stock_count + row.out_of_stock_count === 0 ? (
          <span className="text-slate-400">{t('Aman')}</span>
        ) : (
          <span className="font-medium text-amber-600">
            {row.out_of_stock_count > 0 && t('{v1} habis', { v1: formatNumber(row.out_of_stock_count) })}
            {row.out_of_stock_count > 0 && row.low_stock_count > 0 && ', '}
            {row.low_stock_count > 0 && t('{v1} menipis', { v1: formatNumber(row.low_stock_count) })}
          </span>
        ),
    },
  ]

  async function exportExcel() {
    if (!comparison) return
    await downloadXlsx(
      reportFileName('perbandingan-cabang', todayISO()),
      branchComparisonSheets(comparison, { showHpp: canViewHpp() }),
    )
  }

  return (
    <div>
      <ReportPrintHeader title={t('Perbandingan Cabang')} subtitle={t('Periode {v1} – {v2}', { v1: formatDate(from), v2: formatDate(to) })} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">{t('Perbandingan Cabang')}</h1>
          <p className="text-sm text-slate-500">
            {t('Penjualan, margin, dan kondisi stok semua cabang dalam satu tampilan.')}
          </p>
        </div>
        <ReportActions onExcel={exportExcel} disabled={!comparison} />
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
        <div className="w-56">
          <SelectField label={t('Urutkan')} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            {(Object.keys(SORT_LABEL) as SortKey[])
              .filter((key) => key !== 'gross_margin_pct' || canViewHpp())
              .map((key) => (
                <option key={key} value={key}>
                  {t(SORT_LABEL[key])}
                </option>
              ))}
          </SelectField>
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
              {t('Periode')} {formatDate(comparison?.period.from ?? from)} – {formatDate(comparison?.period.to ?? to)}
              {comparison &&
                t(', dibanding {v1} – {v2}', { v1: formatDate(comparison.period.previous_from), v2: formatDate(comparison.period.previous_to) })}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label={t('Total Penjualan')}
                value={totals ? formatRupiah(totals.sales_total) : '...'}
                hint={
                  totals
                    ? totals.sales_growth_pct == null
                      ? t('{v1} transaksi', { v1: formatNumber(totals.sales_count) })
                      : t('{v1} transaksi · {v2} {v3}%', { v1: formatNumber(totals.sales_count), v2: totals.sales_growth_pct >= 0 ? 'naik' : 'turun', v3: Math.abs(totals.sales_growth_pct) })
                    : undefined
                }
              />
              {canViewHpp() && (
                <StatCard
                  label={t('Gross Profit')}
                  value={totals ? formatRupiah(totals.gross_profit) : '...'}
                  hint={totals ? t('Margin {gross_margin_pct}%', { gross_margin_pct: totals.gross_margin_pct }) : undefined}
                  tone="good"
                />
              )}
              <StatCard label={t('Nilai Stok')} value={totals ? formatRupiah(totals.stock_value) : '...'} />
              <StatCard
                label={t('Stok Kritis')}
                value={totals ? formatNumber(totals.low_stock_count + totals.out_of_stock_count) : '...'}
                hint={totals ? t('{v1} habis, {v2} menipis', { v1: formatNumber(totals.out_of_stock_count), v2: formatNumber(totals.low_stock_count) }) : undefined}
                tone={totals && totals.low_stock_count + totals.out_of_stock_count > 0 ? 'warn' : 'default'}
              />
            </div>

            {branches.some((b) => parseMoney(b.sales_total) > 0) && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs text-slate-500">{t('Penjualan per cabang (maksimal 8 teratas menurut urutan)')}</p>
                <SimpleBarChart
                  bars={branches.slice(0, 8).map((b) => ({
                    label: b.name,
                    value: parseMoney(b.sales_total),
                    colorClass: 'bg-blue-500',
                  }))}
                />
              </div>
            )}

            <div className="mt-4">
              <DataTable
                columns={columns}
                data={branches}
                getRowKey={(row) => row.warehouse_id}
                loading={isLoading}
                emptyMessage={t('Belum ada cabang yang bisa ditampilkan.')}
              />
            </div>
          </>
        )
      )}
    </div>
  )
}
