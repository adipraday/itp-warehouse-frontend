import { formatTimestamp } from '../utils/date'
import type { AppNotification } from '../types/notification'

export function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification
  onOpen: (n: AppNotification) => void
}) {
  const unread = !notification.is_read
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${unread ? 'bg-blue-50/50' : ''}`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? 'bg-blue-600' : 'bg-transparent'}`}
        aria-label={unread ? 'Belum dibaca' : undefined}
      />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
          {notification.title}
        </span>
        <span className="mt-0.5 block text-sm text-slate-600">{notification.body}</span>
        <span className="mt-1 block text-xs text-slate-400">{formatTimestamp(notification.created_at)}</span>
      </span>
    </button>
  )
}
