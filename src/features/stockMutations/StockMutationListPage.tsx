import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/DataTable'
import type { DataTableColumn } from '../../components/DataTable'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { FilterBar } from '../../components/FilterBar'
import { WarehouseSelect } from '../../components/WarehouseSelect'
import { ItemPicker } from '../../components/ItemPicker'
import { SelectField, TextField } from '../../components/FormField'
import { formatNumber, formatRupiah } from '../../utils/money'
import { formatTimestamp } from '../../utils/date'
import { listStockMutations } from '../../api/stockMutations'
import { StockMutationDetailModal } from './StockMutationDetailModal'
import type {
  StockMutation,
  StockMutationDirection,
  StockMutationSourceType,
  StockMutationType,
} from '../../types/stockMutation'
import { useI18n } from '../../i18n/useI18n'

const TYPE_OPTIONS: StockMutationType[] = ['IN', 'OUT', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT']
const DIRECTION_OPTIONS: StockMutationDirection[] = ['IN', 'OUT']
const SOURCE_TYPE_OPTIONS: StockMutationSourceType[] = [
  'INVENTORY_TRANSACTION',
  'RETURN',
  'STOCK_OPNAME',
  'STOCK_TRANSFER',
]

const DIRECTION_STYLE: Record<StockMutationDirection, string> = {
  IN: 'text-emerald-600',
  OUT: 'text-red-600',
}

export default function StockMutationListPage() {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [itemId, setItemId] = useState<number | null>(null)
  const [type, setType] = useState<StockMutationType | ''>('')
  const [direction, setDirection] = useState<StockMutationDirection | ''>('')
  const [sourceType, setSourceType] = useState<StockMutationSourceType | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // Baris yang diklik → detail lengkap (nama gudang/item, nilai per unit, tautan ke dokumen sumber).
  const [selected, setSelected] = useState<StockMutation | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stock-mutations', warehouseId, itemId, type, direction, sourceType, from, to, page],
    queryFn: () =>
      listStockMutations({
        warehouse_id: warehouseId ?? undefined,
        item_id: itemId ?? undefined,
        type: type || undefined,
        direction: direction || undefined,
        source_type: sourceType || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
      }),
  })

  const columns: DataTableColumn<StockMutation>[] = [
    { key: 'occurred_at', header: t('Waktu'), render: (row) => formatTimestamp(row.occurred_at) },
    { key: 'type', header: t('Tipe'), render: (row) => row.type },
    {
      key: 'direction',
      header: t('Arah'),
      render: (row) => <span className={`font-medium ${DIRECTION_STYLE[row.direction]}`}>{row.direction}</span>,
    },
    { key: 'quantity', header: t('Qty'), className: 'text-right', render: (row) => formatNumber(row.quantity) },
    {
      key: 'total_cost',
      header: t('Total Cost'),
      className: 'text-right',
      render: (row) => formatRupiah(row.total_cost),
    },
    {
      key: 'source',
      header: t('Sumber'),
      render: (row) => (
        <span className="text-slate-500">
          {row.source_type} #{row.source_id}
        </span>
      ),
    },
  ]

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">{t('Stock Mutations (Ledger)')}</h1>

      <FilterBar>
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={resetPage(setWarehouseId)} />
        </div>
        <div className="w-56">
          <ItemPicker value={itemId} onChange={resetPage(setItemId)} />
        </div>
        <div className="w-40">
          <SelectField
            label={t('Tipe')}
            value={type}
            onChange={(e) => resetPage(setType)(e.target.value as StockMutationType | '')}
          >
            <option value="">{t('Semua')}</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-32">
          <SelectField
            label={t('Arah')}
            value={direction}
            onChange={(e) => resetPage(setDirection)(e.target.value as StockMutationDirection | '')}
          >
            <option value="">{t('Semua')}</option>
            {DIRECTION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-52">
          <SelectField
            label={t('Sumber')}
            value={sourceType}
            onChange={(e) => resetPage(setSourceType)(e.target.value as StockMutationSourceType | '')}
          >
            <option value="">{t('Semua')}</option>
            {SOURCE_TYPE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-40">
          <TextField label={t('Dari Tanggal')} type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label={t('Sampai Tanggal')} type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </div>
      </FilterBar>

      <div className="mt-4">
        {isError ? (
          <ErrorState error={error} />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              getRowKey={(row) => row.id}
              loading={isLoading}
              emptyMessage={t('Tidak ada mutasi stok.')}
              onRowClick={setSelected}
            />
            {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <StockMutationDetailModal mutation={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
