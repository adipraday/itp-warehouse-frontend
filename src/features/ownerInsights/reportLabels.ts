import type { StuckQueueGroup, StuckQueueKind, UnusualFindingType } from '../../types/dashboard'

// Label dan tautan bersama untuk halaman Pemantauan dan ekspor Excel-nya, supaya tampilan di layar
// dan isi file selalu memakai istilah yang sama.

export interface StuckKindInfo {
  label: string
  status: string
  // Siapa yang harus bertindak — inti Antrean Macet: owner melihat di mana prosesnya tersumbat.
  waitingOn: string
  path: (id: number) => string
}

export const STUCK_KIND_INFO: Record<StuckQueueKind, StuckKindInfo> = {
  transfer_pending_approval: {
    label: 'Transfer',
    status: 'Belum disetujui',
    waitingOn: 'Admin bisnis atau kepala cabang tujuan menyetujui',
    path: (id) => `/stock-transfers/${id}`,
  },
  transfer_pending_completion: {
    label: 'Transfer',
    status: 'Disetujui, belum diselesaikan',
    waitingOn: 'Gudang pengirim menekan Complete',
    path: (id) => `/stock-transfers/${id}`,
  },
  opname_pending_submission: {
    label: 'Stok opname',
    status: 'Draft, belum diajukan',
    waitingOn: 'Staf gudang mengajukan hasil hitung',
    path: (id) => `/stock-opnames/${id}`,
  },
  opname_pending_approval: {
    label: 'Stok opname',
    status: 'Diajukan, belum disetujui',
    waitingOn: 'Admin bisnis menyetujui',
    path: (id) => `/stock-opnames/${id}`,
  },
  return_pending_approval: {
    label: 'Retur',
    status: 'Belum disetujui',
    waitingOn: 'Admin bisnis menyetujui',
    path: (id) => `/returns/${id}`,
  },
  return_pending_completion: {
    label: 'Retur',
    status: 'Disetujui, belum diselesaikan',
    waitingOn: 'Staf menyelesaikan retur',
    path: (id) => `/returns/${id}`,
  },
  sale_held: {
    label: 'Penjualan',
    status: 'Ditahan',
    waitingOn: 'Kasir melanjutkan atau membatalkan',
    path: (id) => `/sales/${id}`,
  },
  sale_draft: {
    label: 'Penjualan',
    status: 'Draft belum selesai',
    waitingOn: 'Kasir menyelesaikan atau menghapus',
    path: (id) => `/sales/${id}`,
  },
  purchase_draft: {
    label: 'Pembelian',
    status: 'Draft belum selesai',
    waitingOn: 'Purchasing menyelesaikan atau menghapus',
    path: (id) => `/purchases/${id}`,
  },
  inbound_draft: {
    label: 'Barang masuk',
    status: 'Draft belum selesai',
    waitingOn: 'Staf gudang menyelesaikan atau menghapus',
    path: (id) => `/inbounds/${id}`,
  },
  outbound_draft: {
    label: 'Barang keluar',
    status: 'Draft belum selesai',
    waitingOn: 'Staf gudang menyelesaikan atau menghapus',
    path: (id) => `/outbounds/${id}`,
  },
}

export const STUCK_GROUP_LABEL: Record<StuckQueueGroup, string> = {
  approval: 'Menunggu persetujuan',
  completion: 'Menunggu diselesaikan',
  draft: 'Draft menggantung',
  held: 'Transaksi tertahan',
}

export const FINDING_TITLE: Record<UnusualFindingType, string> = {
  cancellations: 'Pembatalan dokumen berulang',
  deletions: 'Penghapusan data berulang',
  night_activity: 'Aktivitas transaksi di malam hari',
  item_edits: 'Banyak perubahan data item',
}

export const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Dibuat',
  UPDATE: 'Diubah',
  DELETE: 'Dihapus',
  CANCEL: 'Dibatalkan',
  COMPLETE: 'Diselesaikan',
  APPROVE: 'Disetujui',
  SUBMIT: 'Diajukan',
  REJECT: 'Ditolak',
  HOLD: 'Ditahan',
  RESUME: 'Dilanjutkan',
}

export const ENTITY_LABEL: Record<string, string> = {
  SALE: 'Penjualan',
  PURCHASE: 'Pembelian',
  INBOUND: 'Barang masuk',
  OUTBOUND: 'Barang keluar',
  STOCK_TRANSFER: 'Transfer',
  STOCK_OPNAME: 'Stok opname',
  RETURN: 'Retur',
  PAYMENT: 'Pembayaran',
  ITEM: 'Item',
  CONTACT: 'Kontak',
  WAREHOUSE: 'Warehouse',
}

// Halaman detail per jenis dokumen; jenis tanpa halaman detail (pembayaran, kontak) tidak ditautkan.
export const ENTITY_PATH: Record<string, (id: number) => string> = {
  SALE: (id) => `/sales/${id}`,
  PURCHASE: (id) => `/purchases/${id}`,
  INBOUND: (id) => `/inbounds/${id}`,
  OUTBOUND: (id) => `/outbounds/${id}`,
  STOCK_TRANSFER: (id) => `/stock-transfers/${id}`,
  STOCK_OPNAME: (id) => `/stock-opnames/${id}`,
  RETURN: (id) => `/returns/${id}`,
  ITEM: (id) => `/items/${id}`,
  WAREHOUSE: (id) => `/warehouses/${id}`,
}
