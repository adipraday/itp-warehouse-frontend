import { apiGet, apiPatch } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { AppNotification } from '../types/notification'

// Inbox in-app (backend 2026-10-02). Semua endpoint self-scoped ke user yang login — tidak ada
// gating role. Catatan: baris inbox cuma dibuat backend untuk user yang punya device token FCM
// terdaftar (penerima ditentukan dari tabel `device_tokens`), jadi akun yang tidak pernah login
// di aplikasi mobile akan melihat inbox kosong.
export function listNotifications(params: { page?: number; per_page?: number }) {
  return apiGet<ApiListResponse<AppNotification>>('/notifications', params)
}

export function getUnreadNotificationCount() {
  return apiGet<ApiDetailResponse<{ count: number }>>('/notifications/unread-count')
}

export function markNotificationRead(id: number) {
  return apiPatch<ApiDetailResponse<AppNotification>>(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return apiPatch<ApiDetailResponse<{ updated_count: number }>>('/notifications/read-all')
}
