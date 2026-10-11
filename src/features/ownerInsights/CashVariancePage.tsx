import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { TextField } from '../../components/FormField'
import { StatCard } from '../../components/StatCard'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { CashSessionDetailModal } from '../cashSessions/CashSessionDetailModal'
import { getCashVariance } from '../../api/dashboard'
import { listWarehouses } from '../../api/warehouses'
import { listUsers } from '../../api/users'
import { formatNumber, formatRupiah, parseMoney } from '../../utils/money'
import { daysAgoISO, formatDate, formatTimestamp, todayISO } from '../../utils/date'
import type { CashVarianceSession, CashVarianceWarehouse, OverdueOpenSession } from '../../types/dashboard'

// Teks "Kurang"/"Lebih" selalu ikut tampil di samping warna, supaya tidak bergantung pada warna.
function DifferenceLabel({ value }: { value: string }) {
  const amount = parseMoney(value)
  if (amount === 0) return <span className="font-mono text-slate-500">{formatRupiah(0)}</span>
  const short = amount < 0
  return (
    <span className={`font-mono font-medium ${short ? 'text-red-600' : 'text-amber-600'}`}>
      {formatRupiah(Math.abs(amount))} {short ? 'kurang' : 'lebih'}
    </span>
  )
}

// Pantauan Selisih Kas — sesi kasir yang sudah ditutup dengan selisih uang laci, lintas cabang,
// plus kasir yang lupa menutup sesi (>24 jam). Satu panggilan `GET /dashboard/cash-variance`;
// klik baris membuka detail sesi yang sama dengan Riwayat Sesi Kasir.
export default function CashVariancePage() {
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(todayISO())
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [minDifference, setMinDifference] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)

  const rangeValid = from !== '' && to !== '' && from <= to
  const minAbs = minDifference === '' ? undefined : Number(minDifference)
  const minValid = minAbs === undefined || (Number.isFinite(minAbs) && minAbs >= 0)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-cash-variance', from, to, warehouseId, minAbs],
    queryFn: () =>
      getCashVariance({
        from,
        to,
        warehouse_id: warehouseId ?? undefined,
        min_abs_difference: minAbs,
      }),
    enabled: rangeValid && minValid,
  })
  const report = data?.data

  // Nama cabang dan kasir hanya pemanis tampilan: kalau gagal dimuat, jatuh ke "Warehouse #id" /
  // "User #id" tanpa membuat seluruh laporan error (pola sama seperti Riwayat Sesi Kasir).
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'all', 'assigned'],
    queryFn: () => listWarehouses({ page: 1, per_page: 100, scope: 'assigned' }),
    retry: false,
  })
  const warehouseById = new Map(warehousesData?.data.map((w) => [w.id, w]) ?? [])
  const warehouseLabel = (id: number) => warehouseById.get(id)?.name ?? `Warehouse #${id}`

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all-for-cash-session-history'],
    queryFn: () => listUsers({ page: 1, per_page: 100 }),
    retry: false,
  })
  const usersById = new Map(usersData?.users.map((u) => [u.id, u.name]) ?? [])
  const kasirLabel = (id: number) => usersById.get(id) ?? `User #${id}`

  const summary = report?.summary

  const warehouseColumns: DataTableColumn<CashVarianceWarehouse>[] = [
    { key: 'warehouse', header: 'Cabang', render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'closed', header: 'Sesi Ditutup', className: 'text-right', render: (row) => formatNumber(row.sessions_closed) },
    {
      key: 'variance',
      header: 'Berselisih',
      className: 'text-right',
      render: (row) => (
        <span className={row.sessions_with_variance > 0 ? 'font-medium text-amber-600' : 'text-slate-400'}>
          {formatNumber(row.sessions_with_variance)}
        </span>
      ),
    },
    { key: 'shortage', header: 'Total Kurang', className: 'text-right', render: (row) => formatRupiah(row.shortage) },
    { key: 'overage', header: 'Total Lebih', className: 'text-right', render: (row) => formatRupiah(row.overage) },
    { key: 'net', header: 'Bersih', className: 'text-right', render: (row) => <DifferenceLabel value={row.net} /> },
  ]

  const sessionColumns: DataTableColumn<CashVarianceSession>[] = [
    { key: 'id', header: 'Sesi', render: (row) => `#${row.id}` },
    { key: 'warehouse', header: 'Cabang', render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'kasir', header: 'Kasir', render: (row) => kasirLabel(row.user_id) },
    { key: 'closed_at', header: 'Ditutup', render: (row) => formatTimestamp(row.closed_at) },
    { key: 'expected', header: 'Seharusnya', className: 'text-right', render: (row) => formatRupiah(row.expected_cash_amount) },
    { key: 'counted', header: 'Hasil Hitung', className: 'text-right', render: (row) => formatRupiah(row.closing_amount) },
    { key: 'difference', header: 'Selisih', className: 'text-right', render: (row) => <DifferenceLabel value={row.cash_difference} /> },
    { key: 'notes', header: 'Catatan', render: (row) => row.notes ?? <span className="text-slate-300">—</span> },
  ]

  const overdueColumns: DataTableColumn<OverdueOpenSession>[] = [
    { key: 'id', header: 'Sesi', render: (row) => `#${row.id}` },
    { key: 'warehouse', header: 'Cabang', render: (row) => warehouseLabel(row.warehouse_id) },
    { key: 'kasir', header: 'Kasir', render: (row) => kasirLabel(row.user_id) },
    { key: 'opened_at', header: 'Dibuka', render: (row) => formatTimestamp(row.opened_at) },
    { key: 'opening', header: 'Modal Awal', className: 'text-right', render: (row) => formatRupiah(row.opening_amount) },
  ]

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Pantauan Selisih Kas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Selisih uang laci saat tutup kasir di semua cabang, dan kasir yang belum menutup sesinya.
      </p>

      <FilterBar>
        <div className="w-40">
          <TextField label="Dari" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label="Sampai" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="w-56">
          <WarehouseSelect label="Cabang" placeholder="Semua cabang" value={warehouseId} onChange={setWarehouseId} />
        </div>
        <div className="w-48">
          <TextField
            label="Selisih minimal (Rp)"
            type="number"
            min={0}
            placeholder="Semua selisih"
            value={minDifference}
            onChange={(e) => setMinDifference(e.target.value)}
          />
        </div>
      </FilterBar>

      {!rangeValid && <p className="mt-4 text-sm text-red-600">Tanggal awal tidak boleh setelah tanggal akhir.</p>}
      {!minValid && <p className="mt-4 text-sm text-red-600">Selisih minimal harus berupa angka nol atau lebih.</p>}

      {isError ? (
        <div className="mt-4">
          <ErrorState error={error} />
        </div>
      ) : (
        rangeValid &&
        minValid && (
          <>
            <p className="mt-4 text-xs text-slate-500">
              Sesi yang ditutup {formatDate(report?.period.from ?? from)} – {formatDate(report?.period.to ?? to)}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Sesi Ditutup" value={summary ? formatNumber(summary.sessions_closed) : '...'} />
              <StatCard
                label="Berselisih"
                value={summary ? formatNumber(summary.sessions_with_variance) : '...'}
                tone={summary && summary.sessions_with_variance > 0 ? 'warn' : 'default'}
              />
              <StatCard
                label="Total Kurang"
                value={summary ? formatRupiah(summary.total_shortage) : '...'}
                tone={summary && parseMoney(summary.total_shortage) > 0 ? 'warn' : 'default'}
              />
              <StatCard label="Total Lebih" value={summary ? formatRupiah(summary.total_overage) : '...'} />
              <StatCard
                label="Selisih Bersih"
                value={summary ? formatRupiah(summary.net_difference) : '...'}
                hint={summary ? (parseMoney(summary.net_difference) < 0 ? 'kurang' : parseMoney(summary.net_difference) > 0 ? 'lebih' : undefined) : undefined}
              />
              <StatCard
                label="Belum Ditutup"
                value={summary ? formatNumber(summary.overdue_open_count) : '...'}
                hint="terbuka lebih dari 24 jam"
                tone={summary && summary.overdue_open_count > 0 ? 'warn' : 'default'}
              />
            </div>

            {(report?.overdue_open_sessions.length ?? 0) > 0 && (
              <section className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-amber-700">Sesi kasir belum ditutup lebih dari 24 jam</h2>
                <DataTable
                  columns={overdueColumns}
                  data={report?.overdue_open_sessions ?? []}
                  getRowKey={(row) => row.id}
                  onRowClick={(row) => setDetailId(row.id)}
                />
              </section>
            )}

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Per cabang</h2>
              <DataTable
                columns={warehouseColumns}
                data={report?.by_warehouse ?? []}
                getRowKey={(row) => row.warehouse_id}
                loading={isLoading}
                emptyMessage="Tidak ada sesi kasir yang ditutup pada periode ini."
              />
            </section>

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Selisih terbesar (maksimal 50 sesi)</h2>
              <DataTable
                columns={sessionColumns}
                data={report?.sessions ?? []}
                getRowKey={(row) => row.id}
                loading={isLoading}
                emptyMessage="Tidak ada sesi dengan selisih pada periode ini."
                onRowClick={(row) => setDetailId(row.id)}
              />
            </section>
          </>
        )
      )}

      <CashSessionDetailModal sessionId={detailId} onClose={() => setDetailId(null)} kasirLabel={kasirLabel} />
    </div>
  )
}
