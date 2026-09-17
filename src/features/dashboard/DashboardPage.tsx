import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { TextField } from '../../components/FormField'
import { StatCard } from '../../components/StatCard'
import { SimpleBarChart } from '../../components/SimpleBarChart'
import { ErrorState } from '../../components/ErrorState'
import { usePermissions } from '../../auth/permissions'
import { formatNumber, formatRupiah, parseMoney } from '../../utils/money'
import { firstDayOfMonthISO, todayISO } from '../../utils/date'
import {
  getDashboardProfit,
  getDashboardPurchases,
  getDashboardSales,
  getDashboardStock,
  getDashboardSummary,
} from '../../api/dashboard'
import { listLowStock, listOutOfStock } from '../../api/stocks'

export default function DashboardPage() {
  const { canViewHpp } = usePermissions()
  const hasHppAccess = canViewHpp()
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [summaryDate, setSummaryDate] = useState(todayISO())
  const [rangeFrom, setRangeFrom] = useState(firstDayOfMonthISO())
  const [rangeTo, setRangeTo] = useState(todayISO())

  const whParam = warehouseId ?? undefined

  const stockQuery = useQuery({
    queryKey: ['dashboard-stock', warehouseId],
    queryFn: () => getDashboardStock({ warehouse_id: whParam }),
  })

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', warehouseId, summaryDate],
    queryFn: () => getDashboardSummary({ warehouse_id: whParam, date: summaryDate }),
  })

  const salesQuery = useQuery({
    queryKey: ['dashboard-sales', warehouseId, rangeFrom, rangeTo],
    queryFn: () => getDashboardSales({ warehouse_id: whParam, from: rangeFrom, to: rangeTo }),
  })

  const purchasesQuery = useQuery({
    queryKey: ['dashboard-purchases', warehouseId, rangeFrom, rangeTo],
    queryFn: () => getDashboardPurchases({ warehouse_id: whParam, from: rangeFrom, to: rangeTo }),
  })

  const profitQuery = useQuery({
    queryKey: ['dashboard-profit', warehouseId, rangeFrom, rangeTo],
    queryFn: () => getDashboardProfit({ warehouse_id: whParam, from: rangeFrom, to: rangeTo }),
    // Jangan panggil endpoint ini sama sekali kalau role tidak berhak (§7) — bukan cuma
    // sembunyikan hasilnya, per instruksi eksplisit frontend-integration-guide.md.
    enabled: hasHppAccess,
  })

  const lowStockQuery = useQuery({
    queryKey: ['stocks', 'low', warehouseId, 'dashboard'],
    queryFn: () => listLowStock({ warehouse_id: whParam, per_page: 5 }),
  })

  const outOfStockQuery = useQuery({
    queryKey: ['stocks', 'out', warehouseId, 'dashboard'],
    queryFn: () => listOutOfStock({ warehouse_id: whParam, per_page: 5 }),
  })

  const stock = stockQuery.data?.data
  const summary = summaryQuery.data?.data
  const sales = salesQuery.data?.data
  const purchases = purchasesQuery.data?.data
  const profit = profitQuery.data?.data

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="mb-6 max-w-xs">
        <WarehouseSelect
          label="Warehouse"
          placeholder="Semua warehouse (agregasi total)"
          value={warehouseId}
          onChange={setWarehouseId}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Stok Saat Ini</h2>
        {stockQuery.isError ? (
          <ErrorState error={stockQuery.error} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard label="Total Item" value={stock ? formatNumber(stock.total_items) : '...'} />
            <StatCard label="Total Qty" value={stock ? formatNumber(stock.total_quantity) : '...'} />
            <StatCard label="Total Nilai" value={stock ? formatRupiah(stock.total_value) : '...'} />
            <StatCard
              label="Low Stock"
              value={stock ? formatNumber(stock.low_stock_count) : '...'}
              tone={stock && stock.low_stock_count > 0 ? 'warn' : 'default'}
            />
            <StatCard
              label="Out of Stock"
              value={stock ? formatNumber(stock.out_of_stock_count) : '...'}
              tone={stock && stock.out_of_stock_count > 0 ? 'warn' : 'default'}
            />
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Ringkasan Harian</h2>
          <div className="w-44">
            <TextField label="" type="date" value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} />
          </div>
        </div>
        {summaryQuery.isError ? (
          <ErrorState error={summaryQuery.error} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Jumlah Sales" value={summary ? formatNumber(summary.sales.count) : '...'} />
            <StatCard label="Total Sales" value={summary ? formatRupiah(summary.sales.total_amount) : '...'} />
            <StatCard label="Jumlah Purchase" value={summary ? formatNumber(summary.purchases.count) : '...'} />
            <StatCard label="Total Purchase" value={summary ? formatRupiah(summary.purchases.total_amount) : '...'} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Performa Rentang Tanggal</h2>
          <div className="flex gap-3">
            <div className="w-40">
              <TextField label="" type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
            </div>
            <div className="w-40">
              <TextField label="" type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs text-slate-500">
              Sales vs Purchases ({sales ? formatNumber(sales.count) : '...'} sales, {purchases ? formatNumber(purchases.count) : '...'}{' '}
              purchase)
            </p>
            {salesQuery.isError || purchasesQuery.isError ? (
              <ErrorState error={salesQuery.error ?? purchasesQuery.error} />
            ) : (
              <SimpleBarChart
                bars={[
                  { label: 'Sales', value: sales ? parseMoney(sales.total_amount) : 0, colorClass: 'bg-blue-500' },
                  { label: 'Purchases', value: purchases ? parseMoney(purchases.total_amount) : 0, colorClass: 'bg-amber-500' },
                ]}
              />
            )}
          </div>

          {hasHppAccess && (
            <div className="grid grid-cols-2 gap-4">
              {profitQuery.isError ? (
                <div className="col-span-2">
                  <ErrorState error={profitQuery.error} />
                </div>
              ) : (
                <>
                  <StatCard label="Revenue" value={profit ? formatRupiah(profit.revenue) : '...'} />
                  <StatCard label="COGS" value={profit ? formatRupiah(profit.cogs) : '...'} />
                  <StatCard
                    label="Gross Profit"
                    value={profit ? formatRupiah(profit.gross_profit) : '...'}
                    tone="good"
                  />
                  <StatCard label="Gross Margin" value={profit ? `${profit.gross_margin_pct}%` : '...'} tone="good" />
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Perlu Restock (Low Stock)</h2>
            <Link to="/stocks" className="text-sm text-blue-600 hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white">
            {lowStockQuery.data?.data.length ? (
              <ul className="divide-y divide-slate-100">
                {lowStockQuery.data.data.map((s) => (
                  <li key={s.id} className="flex justify-between px-4 py-2 text-sm">
                    <span>
                      {s.sku} — {s.item_name}
                    </span>
                    <span className="font-medium text-amber-600">
                      {s.quantity}/{s.min_stock}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-400">Tidak ada item low stock.</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Habis Stok (Out of Stock)</h2>
            <Link to="/stocks" className="text-sm text-blue-600 hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white">
            {outOfStockQuery.data?.data.length ? (
              <ul className="divide-y divide-slate-100">
                {outOfStockQuery.data.data.map((s) => (
                  <li key={s.id} className="flex justify-between px-4 py-2 text-sm">
                    <span>
                      {s.sku} — {s.item_name}
                    </span>
                    <span className="font-medium text-red-600">0</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-400">Tidak ada item yang habis.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
