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
import { translate } from '../../i18n/i18n'

// Isi file Excel tiap halaman Pemantauan. Fungsi murni (data dari API → baris sheet) supaya mudah
// diperiksa; nama cabang/orang di-resolve oleh halaman dan dilempar masuk sebagai fungsi.

export interface Labelers {
  warehouseName: (id: number) => string
  userName: (id: number) => string
}

const periodRow = (from: string, to: string): XlsxRow => [translate('Periode'), `${formatDate(from)} s.d. ${formatDate(to)}`]

export function branchComparisonSheets(
  report: BranchComparison,
  options: { showHpp: boolean },
): SheetSpec[] {
  const { showHpp } = options
  const header = headerRow(
    translate('Cabang'),
    translate('Kode'),
    'BU (ID)',
    translate('Penjualan (Rp)'),
    translate('Transaksi'),
    translate('Penjualan periode lalu (Rp)'),
    translate('Pertumbuhan (%)'),
    ...(showHpp ? [translate('Pendapatan (Rp)'), translate('HPP (Rp)'), translate('Laba kotor (Rp)'), translate('Margin (%)')] : []),
    translate('Nilai stok (Rp)'),
    translate('Stok menipis'),
    translate('Stok habis'),
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
      sheet: translate('Perbandingan Cabang'),
      widths: [30, 18, 9, 18, 11, 24, 15, ...(showHpp ? [18, 16, 18, 12] : []), 18, 13, 11],
      data: [
        [bold(translate('Perbandingan Cabang'))],
        periodRow(report.period.from, report.period.to),
        [translate('Pembanding'), `${formatDate(report.period.previous_from)} s.d. ${formatDate(report.period.previous_to)}`],
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
      sheet: translate('Ringkasan'),
      widths: [34, 22],
      data: [
        [bold(translate('Pantauan Selisih Kas'))],
        periodRow(report.period.from, report.period.to),
        [translate('Selisih minimal (Rp)'), rupiah(report.min_abs_difference)],
        [],
        [translate('Sesi ditutup'), integer(s.sessions_closed)],
        [translate('Sesi berselisih'), integer(s.sessions_with_variance)],
        [translate('Total kurang (Rp)'), rupiah(s.total_shortage)],
        [translate('Total lebih (Rp)'), rupiah(s.total_overage)],
        [translate('Selisih bersih (Rp, negatif = kurang)'), rupiah(s.net_difference)],
        [translate('Sesi belum ditutup > 24 jam'), integer(s.overdue_open_count)],
      ],
    },
    {
      sheet: translate('Per Cabang'),
      widths: [30, 14, 12, 16, 16, 16],
      data: [
        headerRow(translate('Cabang'), translate('Sesi ditutup'), translate('Berselisih'), translate('Total kurang (Rp)'), translate('Total lebih (Rp)'), translate('Bersih (Rp)')),
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
      sheet: translate('Sesi Berselisih'),
      widths: [9, 30, 24, 20, 18, 18, 18, 36],
      data: [
        headerRow(translate('Sesi'), translate('Cabang'), translate('Kasir'), translate('Ditutup (WIB)'), translate('Seharusnya (Rp)'), translate('Hasil hitung (Rp)'), translate('Selisih (Rp)'), translate('Catatan')),
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
      sheet: translate('Belum Ditutup'),
      widths: [9, 30, 24, 20, 16],
      data: [
        headerRow(translate('Sesi'), translate('Cabang'), translate('Kasir'), translate('Dibuka (WIB)'), translate('Modal awal (Rp)')),
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
      sheet: translate('Antrean Macet'),
      widths: [12, 16, 18, 28, 36, 46, 20, 24],
      data: [
        [bold(translate('Antrean Macet'))],
        [translate('Per tanggal'), formatDate(report.as_of)],
        [translate('Umur minimal (hari)'), integer(report.min_age_days)],
        [
          translate('Ringkasan'),
          `${translate(STUCK_GROUP_LABEL.approval)}: ${s.by_group.approval}; ${translate(STUCK_GROUP_LABEL.completion)}: ${s.by_group.completion}; ` +
            `${translate(STUCK_GROUP_LABEL.draft)}: ${s.by_group.draft}; ${translate(STUCK_GROUP_LABEL.held)}: ${s.by_group.held}`,
        ],
        ...(s.truncated ? [[translate('Catatan'), translate('Hanya {length} dokumen terlama dari {total} yang ikut diekspor.', { length: report.items.length, total: s.total })] as XlsxRow] : []),
        [],
        headerRow(translate('Menunggu (hari)'), translate('Jenis'), translate('Dokumen'), translate('Status'), translate('Cabang'), translate('Menunggu tindakan'), translate('Sejak (WIB)'), translate('Dibuat oleh')),
        ...report.items.map((item): XlsxRow => [
          integer(item.age_days),
          translate(STUCK_KIND_INFO[item.kind].label),
          item.document_number,
          translate(STUCK_KIND_INFO[item.kind].status),
          item.to_warehouse_id == null
            ? labelers.warehouseName(item.warehouse_id)
            : `${labelers.warehouseName(item.warehouse_id)} → ${labelers.warehouseName(item.to_warehouse_id)}`,
          translate(STUCK_KIND_INFO[item.kind].waitingOn),
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
      sheet: translate('Ringkasan'),
      widths: [36, 20, 14],
      data: [
        [bold(labels.title)],
        [translate('Per tanggal'), formatDate(report.as_of)],
        [
          translate('Dasar umur'),
          translate('Hari sejak jatuh tempo; invoice tanpa jatuh tempo dihitung dari tanggal invoice'),
        ],
        [],
        [translate('Total saldo belum lunas (Rp)'), rupiah(report.total_outstanding), integer(report.invoice_count)],
        [translate('Sudah lewat jatuh tempo (Rp)'), rupiah(report.overdue_total), integer(report.overdue_count)],
        [],
        headerRow(translate('Umur saldo'), translate('Saldo (Rp)'), translate('Invoice')),
        ...report.buckets.map((bucket): XlsxRow => [translate(bucket.label), rupiah(bucket.amount), integer(bucket.count)]),
      ],
    },
    {
      sheet: labels.counterparty,
      widths: [34, 12, 18, 24],
      data: [
        headerRow(labels.counterparty, translate('Invoice'), translate('Saldo (Rp)'), translate('Terlama (hari terlambat)')),
        ...report.by_contact.map((row): XlsxRow => [
          row.contact_name ?? translate('(tanpa nama)'),
          integer(row.count),
          rupiah(row.amount),
          integer(row.oldest_days_overdue),
        ]),
      ],
    },
    {
      sheet: side === 'receivable' ? translate('Invoice Piutang') : translate('Invoice Hutang'),
      widths: [16, 14, 32, 30, 14, 16, 16, 16, 20],
      data: [
        ...(report.truncated ? [[translate('Catatan'), translate('Hanya {length} invoice tertua dari {invoice_count} yang ikut diekspor.', { length: report.items.length, invoice_count: report.invoice_count })] as XlsxRow, []] : []),
        headerRow(
          translate('Invoice'),
          translate('Tanggal'),
          labels.counterparty,
          translate('Cabang'),
          translate('Jatuh tempo'),
          translate('Total (Rp)'),
          translate('Terbayar (Rp)'),
          translate('Sisa (Rp)'),
          translate('Hari terlambat (negatif = belum)'),
        ),
        ...report.items.map((row): XlsxRow => [
          row.invoice_number,
          formatDate(row.invoice_date),
          row.contact_name ?? translate('(tanpa nama)'),
          labelers.warehouseName(row.warehouse_id),
          row.due_date ? formatDate(row.due_date) : translate('Tanpa jatuh tempo'),
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
      sheet: translate('Temuan'),
      widths: [24, 36, 10, 16, 26, 22, 22, 14, 14],
      data: [
        [bold(translate('Aktivitas Tidak Biasa'))],
        periodRow(report.period.from, report.period.to),
        [translate('Catatan'), translate('Pola yang layak ditanyakan, bukan bukti pelanggaran. Log tidak menyimpan nilai sebelum/sesudah.')],
        [],
        headerRow(translate('Orang'), translate('Temuan'), translate('Jumlah'), translate('Tingkat'), translate('Cabang (terbanyak)'), translate('Pertama (WIB)'), translate('Terakhir (WIB)'), translate('Dokumen dibuat'), translate('Dibatalkan (%)')),
        ...report.findings.map((finding): XlsxRow => [
          labelers.userName(finding.user_id),
          translate(FINDING_TITLE[finding.type]),
          integer(finding.count),
          finding.severity === 'high' ? translate('Perlu perhatian') : translate('Perlu dicek'),
          finding.warehouse_id == null ? null : labelers.warehouseName(finding.warehouse_id),
          formatTimestamp(finding.first_at),
          formatTimestamp(finding.last_at),
          finding.documents_created == null ? null : integer(finding.documents_created),
          percent(finding.cancel_rate_pct),
        ]),
      ],
    },
    {
      sheet: translate('Contoh'),
      widths: [24, 36, 22, 14, 24, 28],
      data: [
        headerRow(translate('Orang'), translate('Temuan'), translate('Waktu (WIB)'), translate('Aksi'), translate('Data'), translate('Cabang')),
        ...report.findings.flatMap((finding) =>
          finding.examples.map((example): XlsxRow => [
            labelers.userName(finding.user_id),
            translate(FINDING_TITLE[finding.type]),
            formatTimestamp(example.at),
            translate(ACTION_LABEL[example.action] ?? example.action),
            `${translate(ENTITY_LABEL[example.entity_type] ?? example.entity_type)}${example.entity_id == null ? '' : ` #${example.entity_id}`}`,
            example.warehouse_id == null ? null : labelers.warehouseName(example.warehouse_id),
          ]),
        ),
      ],
    },
  ]
}
