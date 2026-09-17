import { formatRupiah } from '../utils/money'

interface Bar {
  label: string
  value: number
  colorClass: string
}

export function SimpleBarChart({ bars }: { bars: Bar[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1)

  return (
    <div className="space-y-3">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-600">{bar.label}</span>
            <span className="font-medium text-slate-900">{formatRupiah(bar.value)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${bar.colorClass}`}
              style={{ width: `${(bar.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
