// Inbox notifikasi in-app (backend 2026-10-02, modul `notifications`) — satu baris per user
// penerima per push. `data` = payload yang sama dengan data-message FCM (di-set oleh service
// yang mengirim), bentuknya tergantung `type`; backend tidak menjamin skema ketat, jadi semua
// field di sini opsional dan pemakainya wajib defensif.
export interface NotificationData {
  type?: string
  id?: number
  invoice_id?: number
  item_id?: number
  warehouse_id?: number
  [key: string]: unknown
}

export interface AppNotification {
  id: number
  user_id: number
  title: string
  body: string
  type: string | null
  data: NotificationData | null
  is_read: boolean
  created_at: string
}
