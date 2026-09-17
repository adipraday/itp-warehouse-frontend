interface StatCardProps {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'warn' | 'good'
}

const TONE_CLASS: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-slate-900',
  warn: 'text-amber-600',
  good: 'text-emerald-600',
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 font-mono text-xl font-semibold ${TONE_CLASS[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
