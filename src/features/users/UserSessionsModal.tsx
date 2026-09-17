import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../hooks/useToast'
import { getErrorMessage } from '../../api/errors'
import { listUserSessions, revokeUserSession } from '../../api/users'
import { formatIsoTimestamp } from '../../utils/date'
import type { AuthUser } from '../../auth/authApi'

interface UserSessionsModalProps {
  open: boolean
  onClose: () => void
  user: AuthUser | null
}

export function UserSessionsModal({ open, onClose, user }: UserSessionsModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['users', user?.id, 'sessions'],
    queryFn: () => listUserSessions(user!.id),
    enabled: open && !!user,
  })

  const revokeMutation = useMutation({
    mutationFn: (sessionId: number) => revokeUserSession(user!.id, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', user?.id, 'sessions'] })
      toast.show('Sesi berhasil dicabut.', 'success')
    },
    onError: (err) => toast.show(getErrorMessage(err), 'error'),
  })

  return (
    <Modal open={open} onClose={onClose} title={user ? `Riwayat Sesi — ${user.name}` : 'Riwayat Sesi'}>
      {isLoading && <p className="text-sm text-slate-400">Memuat sesi...</p>}

      {!isLoading && (sessions?.length ?? 0) === 0 && (
        <p className="text-sm text-slate-400">Belum ada riwayat sesi.</p>
      )}

      {!isLoading && sessions && sessions.length > 0 && (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={session.status.toUpperCase()} />
                  <p className="text-xs text-slate-400">Login: {formatIsoTimestamp(session.created_at)}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Berlaku sampai: {formatIsoTimestamp(session.expires_at)}
                  {session.revoked_at && <> &middot; Dicabut: {formatIsoTimestamp(session.revoked_at)}</>}
                  {session.used_at && <> &middot; Diperbarui: {formatIsoTimestamp(session.used_at)}</>}
                </p>
              </div>
              {session.status === 'active' && (
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate(session.id)}
                  disabled={revokeMutation.isPending}
                  className="shrink-0 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Cabut
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Tutup
        </button>
      </div>
    </Modal>
  )
}
