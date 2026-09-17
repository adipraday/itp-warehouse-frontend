const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-700',
  UNPAID: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  USED: 'bg-slate-100 text-slate-700',
  REVOKED: 'bg-red-100 text-red-700',
  // Hold/resume Sales (§22 frontend-integration-guide.md) — bukan status dokumen sungguhan (sale
  // yang ditahan tetap DRAFT), cuma indikator visual tambahan.
  DITAHAN: 'bg-amber-100 text-amber-700',
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] font-semibold tracking-wide ${style}`}
    >
      {status}
    </span>
  )
}
