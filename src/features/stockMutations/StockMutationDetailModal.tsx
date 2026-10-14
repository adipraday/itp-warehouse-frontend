import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { getItem } from '../../api/items'
import { getWarehouse } from '../../api/warehouses'
import { formatTimestamp } from '../../utils/date'
import { formatNumber, formatRupiah, parseMoney } from '../../utils/money'
import type { StockMutation } from '../../types/stockMutation'

interface StockMutationDetailModalProps {
  mutation: StockMutation | null
  onClose: () => void
}

const TYPE_LABEL: Record<StockMutation['type'], string> = {
  IN: 'Barang masuk',
  OUT: 'Barang keluar',
  RETURN_IN: 'Retur masuk',
  RETURN_OUT: 'Retur keluar',
  ADJUSTMENT: 'Penyesuaian (opname)',
}

const SOURCE_LABEL: Record<StockMutation['source_type'], string> = {
  INVENTORY_TRANSACTION: 'Transaksi inventori',
  RETURN: 'Retur',
  STOCK_OPNAME: 'Stok opname',
  STOCK_TRANSFER: 'Transfer stok',
}

// Dokumen sumber mutasi: tautan ke halaman detailnya. Mutasi dari transaksi inventori yang masuk
// berasal dari Inbound, yang keluar dari Outbound (sales, penggantian retur, dst.).
function sourceLink(m: StockMutation): { to: string; label: string } {
  switch (m.source_type) {
    case 'INVENTORY_TRANSACTION':
      return m.direction === 'IN'
        ? { to: `/inbounds/${m.source_id}`, label: `Inbound #${m.source_id}` }
        : { to: `/outbounds/${m.source_id}`, label: `Outbound #${m.source_id}` }
    case 'RETURN':
      return { to: `/returns/${m.source_id}`, label: `Retur #${m.source_id}` }
    case 'STOCK_OPNAME':
      return { to: `/stock-opnames/${m.source_id}`, label: `Stok opname #${m.source_id}` }
    case 'STOCK_TRANSFER':
      return { to: `/stock-transfers/${m.source_id}`, label: `Transfer stok #${m.source_id}` }
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
    <Modal open={m != null} onClose={onClose} title={m ? `Mutasi Stok #${m.id}` : undefined}>
      {m && source && (
        <>
          <dl className="divide-y divide-slate-100">
            <Row label="Waktu">{formatTimestamp(m.occurred_at)}</Row>
            <Row label="Tipe">
              {TYPE_LABEL[m.type]} <span className="font-mono text-xs text-slate-400">({m.type})</span>
            </Row>
            <Row label="Gudang">
              {warehouse ? `${warehouse.data.code} — ${warehouse.data.name}` : `Warehouse #${m.warehouse_id}`}
            </Row>
            <Row label="Item">
              <Link to={`/items/${m.item_id}`} className="text-blue-600 hover:underline" onClick={onClose}>
                {item ? `${item.data.sku} — ${item.data.name}` : `Item #${m.item_id}`}
              </Link>
            </Row>
            <Row label="Perubahan stok">
              <span className={isIn ? 'text-emerald-600' : 'text-red-600'}>
                {isIn ? '+' : '-'}
                {formatNumber(m.quantity)}
                {item ? ` ${item.data.unit}` : ''}
              </span>
            </Row>
            <Row label="Total nilai (cost)">{formatRupiah(m.total_cost)}</Row>
            {m.quantity > 0 && <Row label="Nilai per unit">{formatRupiah(unitCost)}</Row>}
            <Row label="Sumber">
              <span className="text-slate-500">{SOURCE_LABEL[m.source_type]}: </span>
              <Link to={source.to} className="text-blue-600 hover:underline" onClick={onClose}>
                {source.label}
              </Link>
            </Row>
            <Row label="Dicatat">{formatTimestamp(m.created_at)}</Row>
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            Buku besar mutasi bersifat permanen: baris ini tidak bisa diubah atau dihapus.
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
