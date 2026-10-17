import type { StuckQueueGroup, StuckQueueKind, UnusualFindingType } from '../../types/dashboard'
import { tk } from '../../i18n/i18n'

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
    label: tk('Transfer'),
    status: tk('Belum disetujui'),
    waitingOn: tk('Admin bisnis atau kepala cabang tujuan menyetujui'),
    path: (id) => `/stock-transfers/${id}`,
  },
  transfer_pending_completion: {
    label: tk('Transfer'),
    status: tk('Disetujui, belum diselesaikan'),
    waitingOn: tk('Gudang pengirim menekan Complete'),
    path: (id) => `/stock-transfers/${id}`,
  },
  opname_pending_submission: {
    label: tk('Stok opname'),
    status: tk('Draft, belum diajukan'),
    waitingOn: tk('Staf gudang mengajukan hasil hitung'),
    path: (id) => `/stock-opnames/${id}`,
  },
  opname_pending_approval: {
    label: tk('Stok opname'),
    status: tk('Diajukan, belum disetujui'),
    waitingOn: tk('Admin bisnis menyetujui'),
    path: (id) => `/stock-opnames/${id}`,
  },
  return_pending_approval: {
    label: tk('Retur'),
    status: tk('Belum disetujui'),
    waitingOn: tk('Admin bisnis menyetujui'),
    path: (id) => `/returns/${id}`,
  },
  return_pending_completion: {
    label: tk('Retur'),
    status: tk('Disetujui, belum diselesaikan'),
    waitingOn: tk('Staf menyelesaikan retur'),
    path: (id) => `/returns/${id}`,
  },
  sale_held: {
    label: tk('Penjualan'),
    status: tk('Ditahan'),
    waitingOn: tk('Kasir melanjutkan atau membatalkan'),
    path: (id) => `/sales/${id}`,
  },
  sale_draft: {
    label: tk('Penjualan'),
    status: tk('Draft belum selesai'),
    waitingOn: tk('Kasir menyelesaikan atau menghapus'),
    path: (id) => `/sales/${id}`,
  },
  purchase_draft: {
    label: tk('Pembelian'),
    status: tk('Draft belum selesai'),
    waitingOn: tk('Purchasing menyelesaikan atau menghapus'),
    path: (id) => `/purchases/${id}`,
  },
  inbound_draft: {
    label: tk('Barang masuk'),
    status: tk('Draft belum selesai'),
    waitingOn: tk('Staf gudang menyelesaikan atau menghapus'),
    path: (id) => `/inbounds/${id}`,
  },
  outbound_draft: {
    label: tk('Barang keluar'),
    status: tk('Draft belum selesai'),
    waitingOn: tk('Staf gudang menyelesaikan atau menghapus'),
    path: (id) => `/outbounds/${id}`,
  },
}

export const STUCK_GROUP_LABEL: Record<StuckQueueGroup, string> = {
  approval: tk('Menunggu persetujuan'),
  completion: tk('Menunggu diselesaikan'),
  draft: tk('Draft menggantung'),
  held: tk('Transaksi tertahan'),
}

export const FINDING_TITLE: Record<UnusualFindingType, string> = {
  cancellations: tk('Pembatalan dokumen berulang'),
  deletions: tk('Penghapusan data berulang'),
  night_activity: tk('Aktivitas transaksi di malam hari'),
  item_edits: tk('Banyak perubahan data item'),
}

export const ACTION_LABEL: Record<string, string> = {
  CREATE: tk('Dibuat'),
  UPDATE: tk('Diubah'),
  DELETE: tk('Dihapus'),
  CANCEL: tk('Dibatalkan'),
  COMPLETE: tk('Diselesaikan'),
  APPROVE: tk('Disetujui'),
  SUBMIT: tk('Diajukan'),
  REJECT: tk('Ditolak'),
  HOLD: tk('Ditahan'),
  RESUME: tk('Dilanjutkan'),
}

export const ENTITY_LABEL: Record<string, string> = {
  SALE: tk('Penjualan'),
  PURCHASE: tk('Pembelian'),
  INBOUND: tk('Barang masuk'),
  OUTBOUND: tk('Barang keluar'),
  STOCK_TRANSFER: tk('Transfer'),
  STOCK_OPNAME: tk('Stok opname'),
  RETURN: tk('Retur'),
  PAYMENT: tk('Pembayaran'),
  ITEM: tk('Item'),
  CONTACT: tk('Kontak'),
  WAREHOUSE: tk('Warehouse'),
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

// Label rentang umur piutang/hutang dikirim backend (aging.service.js); didaftarkan di sini supaya
// terjemahannya ikut dicek `npm run i18n:check`, lalu ditampilkan lewat t(bucket.label).
export const AGING_BUCKET_LABELS = [
  tk('Belum jatuh tempo'),
  tk('1–30 hari'),
  tk('31–60 hari'),
  tk('61–90 hari'),
  tk('Lebih dari 90 hari'),
]
