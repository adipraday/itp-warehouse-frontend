import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { getItem } from '../../api/items'
import { getWarehouse } from '../../api/warehouses'
import { formatTimestamp } from '../../utils/date'
import { formatNumber, formatRupiah, parseMoney } from '../../utils/money'
import type { StockMutation } from '../../types/stockMutation'
import { useI18n } from '../../i18n/useI18n'
import { tk, translate } from '../../i18n/i18n'

interface StockMutationDetailModalProps {
  mutation: StockMutation | null
  onClose: () => void
}

const TYPE_LABEL: Record<StockMutation['type'], string> = {
  IN: tk('Barang masuk'),
  OUT: tk('Barang keluar'),
  RETURN_IN: tk('Retur masuk'),
  RETURN_OUT: tk('Retur keluar'),
  ADJUSTMENT: tk('Penyesuaian (opname)'),
}

const SOURCE_LABEL: Record<StockMutation['source_type'], string> = {
  INVENTORY_TRANSACTION: tk('Transaksi inventori'),
  RETURN: tk('Retur'),
  STOCK_OPNAME: tk('Stok opname'),
  STOCK_TRANSFER: tk('Transfer stok'),
}

// Dokumen sumber mutasi: tautan ke halaman detailnya. Mutasi dari transaksi inventori yang masuk
// berasal dari Inbound, yang keluar dari Outbound (sales, penggantian retur, dst.).
function sourceLink(m: StockMutation): { to: string; label: string } {
  switch (m.source_type) {
    case 'INVENTORY_TRANSACTION':
      return m.direction === 'IN'
        ? { to: `/inbounds/${m.source_id}`, label: translate('Inbound #{source_id}', { source_id: m.source_id }) }
        : { to: `/outbounds/${m.source_id}`, label: translate('Outbound #{source_id}', { source_id: m.source_id }) }
    case 'RETURN':
      return { to: `/returns/${m.source_id}`, label: translate('Retur #{source_id}', { source_id: m.source_id }) }
    case 'STOCK_OPNAME':
      return { to: `/stock-opnames/${m.source_id}`, label: translate('Stok opname #{source_id}', { source_id: m.source_id }) }
    case 'STOCK_TRANSFER':
      return { to: `/stock-transfers/${m.source_id}`, label: translate('Transfer stok #{source_id}', { source_id: m.source_id }) }
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  )
}

// Detail satu baris buku besar mutasi stok. Nama gudang dan item di-resolve dari id-nya (baris
// daftar hanya membawa id); tidak ada data yang diubah dari sini — ledger bersifat baca-saja.
export function StockMutationDetailModal({ mutation, onClose }: StockMutationDetailModalProps) {
  const { t } = useI18n()
  const { data: warehouse } = useQuery({
    queryKey: ['warehouses', mutation?.warehouse_id],
    queryFn: () => getWarehouse(mutation?.warehouse_id as number),
    enabled: !!mutation,
  })
  const { data: item } = useQuery({
    queryKey: ['items', mutation?.item_id],
    queryFn: () => getItem(mutation?.item_id as number),
    enabled: !!mutation,
  })

  const m = mutation
  const isIn = m?.direction === 'IN'
  const totalCost = m ? parseMoney(m.total_cost) : 0
  const unitCost = m && m.quantity > 0 ? totalCost / m.quantity : 0
  const source = m ? sourceLink(m) : null

  return (
    <Modal open={m != null} onClose={onClose} title={m ? t('Mutasi Stok #{id}', { id: m.id }) : undefined}>
      {m && source && (
        <>
          <dl className="divide-y divide-slate-100">
            <Row label={t('Waktu')}>{formatTimestamp(m.occurred_at)}</Row>
            <Row label={t('Tipe')}>
              {translate(TYPE_LABEL[m.type])} <span className="font-mono text-xs text-slate-400">({m.type})</span>
            </Row>
            <Row label={t('Gudang')}>
              {warehouse ? `${warehouse.data.code} — ${warehouse.data.name}` : t('Warehouse #{warehouse_id}', { warehouse_id: m.warehouse_id })}
            </Row>
            <Row label={t('Item')}>
              <Link to={`/items/${m.item_id}`} className="text-blue-600 hover:underline" onClick={onClose}>
                {item ? `${item.data.sku} — ${item.data.name}` : t('Item #{item_id}', { item_id: m.item_id })}
              </Link>
            </Row>
            <Row label={t('Perubahan stok')}>
              <span className={isIn ? 'text-emerald-600' : 'text-red-600'}>
                {isIn ? '+' : '-'}
                {formatNumber(m.quantity)}
                {item ? ` ${item.data.unit}` : ''}
              </span>
            </Row>
            <Row label={t('Total nilai (cost)')}>{formatRupiah(m.total_cost)}</Row>
            {m.quantity > 0 && <Row label={t('Nilai per unit')}>{formatRupiah(unitCost)}</Row>}
            <Row label={t('Sumber')}>
              <span className="text-slate-500">{translate(SOURCE_LABEL[m.source_type])}: </span>
              <Link to={source.to} className="text-blue-600 hover:underline" onClick={onClose}>
                {source.label}
              </Link>
            </Row>
            <Row label={t('Dicatat')}>{formatTimestamp(m.created_at)}</Row>
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            {t('Buku besar mutasi bersifat permanen: baris ini tidak bisa diubah atau dihapus.')}
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('Tutup')}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
