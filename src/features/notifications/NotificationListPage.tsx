import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pagination } from '../../components/Pagination'
import { ErrorState } from '../../components/ErrorState'
import { NotificationItem } from '../../components/NotificationItem'
import { listNotifications } from '../../api/notifications'
import { useNotificationActions } from '../../hooks/useNotificationActions'

export default function NotificationListPage() {
  const [page, setPage] = useState(1)
  const { openNotification, markAllRead, markingAll } = useNotificationActions()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications', 'list', page],
    queryFn: () => listNotifications({ page, per_page: 20 }),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Notifikasi</h1>
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Tandai semua dibaca
        </button>
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : (
        <>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {isLoading && <p className="px-4 py-8 text-center text-sm text-slate-400">Memuat data...</p>}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Belum ada notifikasi.</p>
            )}
            {data?.data.map((n) => (
              <NotificationItem key={n.id} notification={n} onOpen={openNotification} />
            ))}
          </div>
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  )
}
