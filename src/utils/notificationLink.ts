import type { AppNotification } from '../types/notification'

/**
 * Tujuan klik sebuah notifikasi, dari `data.type` yang dikirim backend (tiap service pengirim
 * push meng-set tipe + id dokumennya: inbound/outbound/sale/return/stock_opname/stock_transfer
 * pakai `id` dokumen itu sendiri, `purchase_payment` pakai `invoice_id` karena `id`-nya id
 * payment, `low_stock`/`out_of_stock` pakai `item_id`). Tipe yang belum dikenal → null (cuma
 * ditandai dibaca, tidak pindah halaman) — jangan tebak rute buat tipe baru.
 *
 * `cash_session_discrepancy` nunjuk ke Riwayat Sesi Kasir, yang digating `canViewActivityLogs`
 * (lihat App.tsx) — role tanpa akses itu jatuh ke halaman Sesi Kasir milik sendiri.
 */
export function getNotificationPath(n: AppNotification, opts: { canViewCashHistory: boolean }): string | null {
  const type = n.data?.type ?? n.type
  const id = n.data?.id

  switch (type) {
    case 'inbound':
      return id ? `/inbounds/${id}` : null
    case 'outbound':
      return id ? `/outbounds/${id}` : null
    case 'sale':
      return id ? `/sales/${id}` : null
    case 'return':
      return id ? `/returns/${id}` : null
    case 'stock_opname':
      return id ? `/stock-opnames/${id}` : null
    case 'stock_transfer':
      return id ? `/stock-transfers/${id}` : null
    case 'purchase_payment':
      return n.data?.invoice_id ? `/purchases/${n.data.invoice_id}` : null
    case 'low_stock':
    case 'out_of_stock':
      return n.data?.item_id ? `/items/${n.data.item_id}` : null
    case 'cash_session_discrepancy':
      return opts.canViewCashHistory ? '/cash-sessions/history' : '/cash-session'
    default:
      return null
  }
}
