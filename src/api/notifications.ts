import { apiGet, apiPatch } from './client'
import type { ApiDetailResponse, ApiListResponse } from '../types/common'
import type { AppNotification } from '../types/notification'

// Inbox in-app (backend 2026-10-02). Semua endpoint self-scoped ke user yang login — tidak ada
// gating role. Penerima baris inbox = pemilik device token FCM DAN user di `user_directory` yang
// cocok role/BU/warehouse-nya (sejak 2026-10-05, tanpa perlu device token) — user baru jadi
// penerima setelah request pertamanya ke API; event sebelum itu tidak di-backfill.
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
