import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../auth/permissions'
import { markAllNotificationsRead, markNotificationRead } from '../api/notifications'
import { getNotificationPath } from '../utils/notificationLink'
import type { AppNotification } from '../types/notification'

/**
 * Aksi bersama bell dropdown & halaman /notifications: klik notifikasi = tandai dibaca (kalau
 * belum) lalu pindah ke dokumen terkait (kalau tipenya dikenal), "tandai semua dibaca".
 */
export function useNotificationActions(onNavigate?: () => void) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { canViewActivityLogs } = usePermissions()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const readMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate })
  const readAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate })

  function openNotification(n: AppNotification) {
    if (!n.is_read) readMutation.mutate(n.id)
    const path = getNotificationPath(n, { canViewCashHistory: canViewActivityLogs() })
    if (path) {
      navigate(path)
      onNavigate?.()
    }
  }

  return {
    openNotification,
    markAllRead: () => readAllMutation.mutate(),
    markingAll: readAllMutation.isPending,
  }
}
