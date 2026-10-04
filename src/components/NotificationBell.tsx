import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUnreadNotificationCount, listNotifications } from '../api/notifications'
import { useNotificationActions } from '../hooks/useNotificationActions'
import { NotificationItem } from './NotificationItem'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { openNotification, markAllRead, markingAll } = useNotificationActions(() => setOpen(false))

  // Polling ringan (60 dtk) + refetch saat tab difokuskan lagi (default react-query) — badge
  // tidak perlu realtime, push FCM-nya sendiri untuk perangkat mobile.
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60_000,
    retry: false,
  })
  const unreadCount = unread?.data.count ?? 0

  const { data: latest, isLoading } = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => listNotifications({ page: 1, per_page: 8 }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
        aria-expanded={open}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5c0 2.6-.8 4-1.6 4.9-.4.4-.1 1.1.5 1.1h11.2c.6 0 .9-.7.5-1.1-.8-.9-1.6-2.3-1.6-4.9A4.5 4.5 0 0 0 10 2.5ZM8 15.5a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-900">Notifikasi</span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll || unreadCount === 0}
              className="text-xs font-medium text-blue-600 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              Tandai semua dibaca
            </button>
          </div>

          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {isLoading && <p className="px-4 py-6 text-center text-sm text-slate-400">Memuat...</p>}
            {!isLoading && (latest?.data.length ?? 0) === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Belum ada notifikasi.</p>
            )}
            {latest?.data.map((n) => (
              <NotificationItem key={n.id} notification={n} onOpen={openNotification} />
            ))}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-slate-50"
          >
            Lihat semua notifikasi
          </Link>
        </div>
      )}
    </div>
  )
}
