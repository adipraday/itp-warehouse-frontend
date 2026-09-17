import { useMemo } from 'react'

export type DocumentAction = 'edit' | 'delete' | 'submit' | 'approve' | 'complete' | 'reject' | 'cancel'

export type DocumentLifecycleConfig = Record<string, DocumentAction[]>

/**
 * Pola document lifecycle (DRAFT -> ... -> status final) dipakai berulang di
 * inbound/outbound/transfer/opname/sales/purchase/return. Config per modul
 * ada di bawah, dipakai bareng `useDocumentActions` supaya tombol aksi yang
 * tampil di UI selalu konsisten dengan status dokumen.
 */
export const INVENTORY_TRANSACTION_LIFECYCLE: DocumentLifecycleConfig = {
  DRAFT: ['edit', 'delete', 'complete', 'cancel'],
  COMPLETED: [],
  CANCELLED: [],
}

export const INVOICE_LIFECYCLE: DocumentLifecycleConfig = INVENTORY_TRANSACTION_LIFECYCLE

export const STOCK_TRANSFER_LIFECYCLE: DocumentLifecycleConfig = {
  DRAFT: ['edit', 'delete', 'approve', 'cancel'],
  APPROVED: ['complete', 'cancel'],
  COMPLETED: [],
  CANCELLED: [],
}

export const STOCK_OPNAME_LIFECYCLE: DocumentLifecycleConfig = {
  DRAFT: ['edit', 'delete', 'submit', 'cancel'],
  SUBMITTED: ['approve', 'cancel'],
  APPROVED: [],
  CANCELLED: [],
}

export const RETURN_LIFECYCLE: DocumentLifecycleConfig = {
  DRAFT: ['edit', 'delete', 'approve', 'cancel'],
  APPROVED: ['complete', 'reject', 'cancel'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
}

export function useDocumentActions(status: string, config: DocumentLifecycleConfig) {
  return useMemo(() => {
    const actions = config[status] ?? []
    return {
      actions,
      can: (action: DocumentAction) => actions.includes(action),
    }
  }, [status, config])
}
