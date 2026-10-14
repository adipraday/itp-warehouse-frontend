import type { Invoice } from '../../types/invoice'

// Pembelian punya tahap persetujuan gudang yang bukan status dokumen (status tetap DRAFT sampai
// seluruh barang diterima/ditutup). Tahap ini diturunkan dari status + receipt_status supaya
// seluruh UI memakai satu istilah yang sama.
export function purchaseStage(p: Pick<Invoice, 'status' | 'receipt_status'>): string {
  if (p.status === 'DRAFT' && p.receipt_status === 'PENDING_APPROVAL') return 'MENUNGGU PERSETUJUAN'
  if (p.status === 'DRAFT' && p.receipt_status === 'PARTIALLY_RECEIVED') return 'DITERIMA SEBAGIAN'
  return p.status
}

// Masih menunggu barang (belum final): bisa diterima, ditunggu penggantinya, atau dibatalkan.
export function isAwaitingGoods(p: Pick<Invoice, 'status' | 'receipt_status'>): boolean {
  return p.status === 'DRAFT' && !!p.receipt_status
}
