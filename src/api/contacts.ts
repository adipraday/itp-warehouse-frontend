import { apiGet, apiPost, apiPut } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { Contact, ContactInput, ContactType } from '../types/contact'

export function listContacts(params: { type?: ContactType; page?: number; per_page?: number }) {
  return apiGet<ApiListResponse<Contact>>('/contacts', params)
}

export function getContact(id: number) {
  return apiGet<ApiDetailResponse<Contact>>(`/contacts/${id}`)
}

export function createContact(body: ContactInput) {
  return apiPost<ApiDetailResponse<Contact>>('/contacts', body)
}

export function updateContact(id: number, body: ContactInput) {
  return apiPut<ApiDetailResponse<Contact>>(`/contacts/${id}`, body)
}
