import { bold, headerRow, integer, percent, rupiah } from '../../utils/exportXlsx'
import type { SheetSpec, XlsxRow } from '../../utils/exportXlsx'
import { formatDate, formatTimestamp } from '../../utils/date'
import type {
  Aging,
  AgingSide,
  BranchComparison,
  CashVariance,
  StuckQueue,
  UnusualActivity,
} from '../../types/dashboard'
import { ACTION_LABEL, ENTITY_LABEL, FINDING_TITLE, STUCK_GROUP_LABEL, STUCK_KIND_INFO } from './reportLabels'

// Isi file Excel tiap halaman Pemantauan. Fungsi murni (data dari API → baris sheet) supaya mudah
// diperiksa; nama cabang/orang di-resolve oleh halaman dan dilempar masuk sebagai fungsi.

export interface Labelers {
  warehouseName: (id: number) => string
  userName: (id: number) => string
}

const periodRow = (from: string, to: string): XlsxRow => ['Periode', `${formatDate(from)} s.d. ${formatDate(to)}`]

export function branchComparisonSheets(
  report: BranchComparison,
  options: { showHpp: boolean },
): SheetSpec[] {
  const { showHpp } = options
  const header = headerRow(
    'Cabang',
    'Kode',
    'BU (ID)',
    'Penjualan (Rp)',
    'Transaksi',
    'Penjualan periode lalu (Rp)',
    'Pertumbuhan (%)',
    ...(showHpp ? ['Pendapatan (Rp)', 'HPP (Rp)', 'Laba kotor (Rp)', 'Margin (%)'] : []),
    'Nilai stok (Rp)',
    'Stok menipis',
    'Stok habis',
  )
  const rows: XlsxRow[] = report.branches.map((branch) => [
    branch.name,
    branch.code,
    branch.bu_id,
    rupiah(branch.sales_total),
    integer(branch.sales_count),
    rupiah(branch.previous_sales_total),
    percent(branch.sales_growth_pct),
    ...(showHpp
      ? [rupiah(branch.revenue), rupiah(branch.cogs), rupiah(branch.gross_profit), percent(branch.gross_margin_pct)]
      : []),
    rupiah(branch.stock_value),
    integer(branch.low_stock_count),
    integer(branch.out_of_stock_count),
  ])
  const t = report.totals
  const total: XlsxRow = [
    bold('TOTAL'),
    null,
    null,
    rupiah(t.sales_total, true),
    integer(t.sales_count, true),
    rupiah(t.previous_sales_total, true),
    percent(t.sales_growth_pct),
    ...(showHpp ? [rupiah(t.revenue, true), null, rupiah(t.gross_profit, true), percent(t.gross_margin_pct)] : []),
    rupiah(t.stock_value, true),
    integer(t.low_stock_count, true),
    integer(t.out_of_stock_count, true),
  ]
  return [
    {
      sheet: 'Perbandingan Cabang',
      widths: [30, 18, 9, 18, 11, 24, 15, ...(showHpp ? [18, 16, 18, 12] : []), 18, 13, 11],
      data: [
        [bold('Perbandingan Cabang')],
        periodRow(report.period.from, report.period.to),
        ['Pembanding', `${formatDate(report.period.previous_from)} s.d. ${formatDate(report.period.previous_to)}`],
        [],
        header,
        ...rows,
        total,
      ],
    },
  ]
}

export function cashVarianceSheets(report: CashVariance, labelers: Labelers): SheetSpec[] {
  const s = report.summary
  return [
    {
      sheet: 'Ringkasan',
      widths: [34, 22],
      data: [
        [bold('Pantauan Selisih Kas')],
        periodRow(report.period.from, report.period.to),
        ['Selisih minimal (Rp)', rupiah(report.min_abs_difference)],
        [],
        ['Sesi ditutup', integer(s.sessions_closed)],
        ['Sesi berselisih', integer(s.sessions_with_variance)],
        ['Total kurang (Rp)', rupiah(s.total_shortage)],
        ['Total lebih (Rp)', rupiah(s.total_overage)],
        ['Selisih bersih (Rp, negatif = kurang)', rupiah(s.net_difference)],
        ['Sesi belum ditutup > 24 jam', integer(s.overdue_open_count)],
      ],
    },
    {
      sheet: 'Per Cabang',
      widths: [30, 14, 12, 16, 16, 16],
      data: [
        headerRow('Cabang', 'Sesi ditutup', 'Berselisih', 'Total kurang (Rp)', 'Total lebih (Rp)', 'Bersih (Rp)'),
        ...report.by_warehouse.map((row): XlsxRow => [
          labelers.warehouseName(row.warehouse_id),
          integer(row.sessions_closed),
          integer(row.sessions_with_variance),
          rupiah(row.shortage),
          rupiah(row.overage),
          rupiah(row.net),
        ]),
      ],
    },
    {
      sheet: 'Sesi Berselisih',
      widths: [9, 30, 24, 20, 18, 18, 18, 36],
      data: [
        headerRow('Sesi', 'Cabang', 'Kasir', 'Ditutup (WIB)', 'Seharusnya (Rp)', 'Hasil hitung (Rp)', 'Selisih (Rp)', 'Catatan'),
        ...report.sessions.map((row): XlsxRow => [
          integer(row.id),
          labelers.warehouseName(row.warehouse_id),
          labelers.userName(row.user_id),
          formatTimestamp(row.closed_at),
          rupiah(row.expected_cash_amount),
          rupiah(row.closing_amount),
          rupiah(row.cash_difference),
          row.notes,
        ]),
      ],
    },
    {
      sheet: 'Belum Ditutup',
      widths: [9, 30, 24, 20, 16],
      data: [
        headerRow('Sesi', 'Cabang', 'Kasir', 'Dibuka (WIB)', 'Modal awal (Rp)'),
        ...report.overdue_open_sessions.map((row): XlsxRow => [
          integer(row.id),
          labelers.warehouseName(row.warehouse_id),
          labelers.userName(row.user_id),
          formatTimestamp(row.opened_at),
          rupiah(row.opening_amount),
        ]),
      ],
    },
  ]
}

export function stuckQueueSheets(report: StuckQueue, labelers: Labelers): SheetSpec[] {
  const s = report.summary
  return [
    {
      sheet: 'Antrean Macet',
      widths: [12, 16, 18, 28, 36, 46, 20, 24],
      data: [
        [bold('Antrean Macet')],
        ['Per tanggal', formatDate(report.as_of)],
        ['Umur minimal (hari)', integer(report.min_age_days)],
        [
          'Ringkasan',
          `${STUCK_GROUP_LABEL.approval}: ${s.by_group.approval}; ${STUCK_GROUP_LABEL.completion}: ${s.by_group.completion}; ` +
            `${STUCK_GROUP_LABEL.draft}: ${s.by_group.draft}; ${STUCK_GROUP_LABEL.held}: ${s.by_group.held}`,
        ],
        ...(s.truncated ? [['Catatan', `Hanya ${report.items.length} dokumen terlama dari ${s.total} yang ikut diekspor.`] as XlsxRow] : []),
        [],
        headerRow('Menunggu (hari)', 'Jenis', 'Dokumen', 'Status', 'Cabang', 'Menunggu tindakan', 'Sejak (WIB)', 'Dibuat oleh'),
        ...report.items.map((item): XlsxRow => [
          integer(item.age_days),
          STUCK_KIND_INFO[item.kind].label,
          item.document_number,
          STUCK_KIND_INFO[item.kind].status,
          item.to_warehouse_id == null
            ? labelers.warehouseName(item.warehouse_id)
            : `${labelers.warehouseName(item.warehouse_id)} → ${labelers.warehouseName(item.to_warehouse_id)}`,
          STUCK_KIND_INFO[item.kind].waitingOn,
          formatTimestamp(item.waiting_since),
          item.created_by == null ? null : labelers.userName(item.created_by),
        ]),
      ],
    },
  ]
}

export function agingSheets(report: Aging, labelers: Labelers, labels: { title: string; counterparty: string }): SheetSpec[] {
  const side: AgingSide = report.side
  return [
    {
      sheet: 'Ringkasan',
      widths: [36, 20, 14],
      data: [
        [bold(labels.title)],
        ['Per tanggal', formatDate(report.as_of)],
        [
          'Dasar umur',
          'Hari sejak jatuh tempo; invoice tanpa jatuh tempo dihitung dari tanggal invoice',
        ],
        [],
        ['Total saldo belum lunas (Rp)', rupiah(report.total_outstanding), integer(report.invoice_count)],
        ['Sudah lewat jatuh tempo (Rp)', rupiah(report.overdue_total), integer(report.overdue_count)],
        [],
        headerRow('Umur saldo', 'Saldo (Rp)', 'Invoice'),
        ...report.buckets.map((bucket): XlsxRow => [bucket.label, rupiah(bucket.amount), integer(bucket.count)]),
      ],
    },
    {
      sheet: labels.counterparty,
      widths: [34, 12, 18, 24],
      data: [
        headerRow(labels.counterparty, 'Invoice', 'Saldo (Rp)', 'Terlama (hari terlambat)'),
        ...report.by_contact.map((row): XlsxRow => [
          row.contact_name ?? '(tanpa nama)',
          integer(row.count),
          rupiah(row.amount),
          integer(row.oldest_days_overdue),
        ]),
      ],
    },
    {
      sheet: side === 'receivable' ? 'Invoice Piutang' : 'Invoice Hutang',
      widths: [16, 14, 32, 30, 14, 16, 16, 16, 20],
      data: [
        ...(report.truncated ? [['Catatan', `Hanya ${report.items.length} invoice tertua dari ${report.invoice_count} yang ikut diekspor.`] as XlsxRow, []] : []),
        headerRow(
          'Invoice',
          'Tanggal',
          labels.counterparty,
          'Cabang',
          'Jatuh tempo',
          'Total (Rp)',
          'Terbayar (Rp)',
          'Sisa (Rp)',
          'Hari terlambat (negatif = belum)',
        ),
        ...report.items.map((row): XlsxRow => [
          row.invoice_number,
          formatDate(row.invoice_date),
          row.contact_name ?? '(tanpa nama)',
          labelers.warehouseName(row.warehouse_id),
          row.due_date ? formatDate(row.due_date) : 'Tanpa jatuh tempo',
          rupiah(row.total_amount),
          rupiah(row.paid_amount),
          rupiah(row.outstanding),
          integer(row.days_overdue),
        ]),
      ],
    },
  ]
}

export function unusualActivitySheets(report: UnusualActivity, labelers: Labelers): SheetSpec[] {
  return [
    {
      sheet: 'Temuan',
      widths: [24, 36, 10, 16, 26, 22, 22, 14, 14],
      data: [
        [bold('Aktivitas Tidak Biasa')],
        periodRow(report.period.from, report.period.to),
        ['Catatan', 'Pola yang layak ditanyakan, bukan bukti pelanggaran. Log tidak menyimpan nilai sebelum/sesudah.'],
        [],
        headerRow('Orang', 'Temuan', 'Jumlah', 'Tingkat', 'Cabang (terbanyak)', 'Pertama (WIB)', 'Terakhir (WIB)', 'Dokumen dibuat', 'Dibatalkan (%)'),
        ...report.findings.map((finding): XlsxRow => [
          labelers.userName(finding.user_id),
          FINDING_TITLE[finding.type],
          integer(finding.count),
          finding.severity === 'high' ? 'Perlu perhatian' : 'Perlu dicek',
          finding.warehouse_id == null ? null : labelers.warehouseName(finding.warehouse_id),
          formatTimestamp(finding.first_at),
          formatTimestamp(finding.last_at),
          finding.documents_created == null ? null : integer(finding.documents_created),
          percent(finding.cancel_rate_pct),
        ]),
      ],
    },
    {
      sheet: 'Contoh',
      widths: [24, 36, 22, 14, 24, 28],
      data: [
        headerRow('Orang', 'Temuan', 'Waktu (WIB)', 'Aksi', 'Data', 'Cabang'),
        ...report.findings.flatMap((finding) =>
          finding.examples.map((example): XlsxRow => [
            labelers.userName(finding.user_id),
            FINDING_TITLE[finding.type],
            formatTimestamp(example.at),
            ACTION_LABEL[example.action] ?? example.action,
            `${ENTITY_LABEL[example.entity_type] ?? example.entity_type}${example.entity_id == null ? '' : ` #${example.entity_id}`}`,
            example.warehouse_id == null ? null : labelers.warehouseName(example.warehouse_id),
          ]),
        ),
      ],
    },
  ]
}
