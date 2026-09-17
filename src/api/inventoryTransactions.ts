import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type {
  InventoryTransaction,
  InventoryTransactionInput,
  InventoryTransactionStatus,
} from '../types/inventoryTransaction'

export type InventoryTransactionKind = 'inbound' | 'outbound'

function basePath(kind: InventoryTransactionKind): string {
  return kind === 'inbound' ? '/inbounds' : '/outbounds'
}

type ListParams = {
  warehouse_id?: number
  status?: InventoryTransactionStatus
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export function listInventoryTransactions(kind: InventoryTransactionKind, params: ListParams) {
  return apiGet<ApiListResponse<InventoryTransaction>>(basePath(kind), params)
}

export function getInventoryTransaction(kind: InventoryTransactionKind, id: number) {
  return apiGet<ApiDetailResponse<InventoryTransaction>>(`${basePath(kind)}/${id}`)
}

export function createInventoryTransaction(kind: InventoryTransactionKind, body: InventoryTransactionInput) {
  return apiPost<ApiDetailResponse<InventoryTransaction>>(basePath(kind), body)
}

export function updateInventoryTransaction(
  kind: InventoryTransactionKind,
  id: number,
  body: InventoryTransactionInput,
) {
  return apiPut<ApiDetailResponse<InventoryTransaction>>(`${basePath(kind)}/${id}`, body)
}

export function deleteInventoryTransaction(kind: InventoryTransactionKind, id: number) {
  return apiDelete<null>(`${basePath(kind)}/${id}`)
}

export function completeInventoryTransaction(kind: InventoryTransactionKind, id: number, idempotencyKey: string) {
  return apiPost<ApiDetailResponse<InventoryTransaction>>(`${basePath(kind)}/${id}/complete`, undefined, {
    idempotencyKey,
  })
}

export function cancelInventoryTransaction(kind: InventoryTransactionKind, id: number) {
  return apiPost<ApiDetailResponse<InventoryTransaction>>(`${basePath(kind)}/${id}/cancel`)
}
