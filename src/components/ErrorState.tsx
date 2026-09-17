import { getErrorMessage } from '../api/errors'

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Gagal memuat data: {getErrorMessage(error)}
    </div>
  )
}
