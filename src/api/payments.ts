import { apiGet, apiPost } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { Payment, PaymentInput } from '../types/payment'

type ListParams = {
  invoice_id?: number
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export function listPayments(params: ListParams) {
  return apiGet<ApiListResponse<Payment>>('/payments', params)
}

export function getPayment(id: number) {
  return apiGet<ApiDetailResponse<Payment>>(`/payments/${id}`)
}

export function createPayment(body: PaymentInput) {
  return apiPost<ApiDetailResponse<Payment>>('/payments', body)
}
