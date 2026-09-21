import { formatRupiah } from '../utils/money'

interface Point {
  label: string
  value: number
}

const WIDTH = 600
const HEIGHT = 180
const PAD_X = 8
const PAD_TOP = 12
const PAD_BOTTOM = 24

/**
 * Line chart tanpa dependency eksternal (project ini nggak punya charting lib) — dipakai
 * khusus buat data trend per-tanggal (mis. GET /api/dashboard/sales-trend). Sengaja minimal
 * sama seperti SimpleBarChart: SVG polyline + titik, tooltip native lewat <title> (bukan
 * custom hover state), label sumbu-X dibatasi max ~6 biar nggak numpuk kalau rentang tanggal
 * panjang (mis. 1 bulan = 30 titik).
 */
export function SimpleLineChart({ points, colorClass = 'stroke-blue-500' }: { points: Point[]; colorClass?: string }) {
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Tidak ada data pada rentang ini.</p>
  }

  const max = Math.max(...points.map((p) => p.value), 1)
  const plotWidth = WIDTH - PAD_X * 2
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  function x(i: number): number {
    return points.length === 1 ? PAD_X + plotWidth / 2 : PAD_X + (i / (points.length - 1)) * plotWidth
  }
  function y(value: number): number {
    return PAD_TOP + plotHeight - (value / max) * plotHeight
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ')
  const areaPath = `${linePath} L ${x(points.length - 1)} ${PAD_TOP + plotHeight} L ${x(0)} ${PAD_TOP + plotHeight} Z`

  // Tampilkan cuma sampai 6 label sumbu-X (selalu termasuk titik pertama & terakhir) biar
  // tetap kebaca walau datanya banyak titik.
  const labelStep = Math.max(1, Math.ceil(points.length / 6))
  const labeledIndexes = new Set<number>()
  for (let i = 0; i < points.length; i += labelStep) labeledIndexes.add(i)
  labeledIndexes.add(points.length - 1)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((frac) => (
        <line
          key={frac}
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={PAD_TOP + plotHeight * (1 - frac)}
          y2={PAD_TOP + plotHeight * (1 - frac)}
          className="stroke-slate-100"
          strokeWidth={1}
        />
      ))}

      <path d={areaPath} className="fill-blue-50" />
      <path d={linePath} className={colorClass} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle key={p.label} cx={x(i)} cy={y(p.value)} r={3} className={`${colorClass} fill-white`} strokeWidth={2}>
          <title>
            {p.label}: {formatRupiah(p.value)}
          </title>
        </circle>
      ))}

      {points.map(
        (p, i) =>
          labeledIndexes.has(i) && (
            <text
              key={`label-${p.label}`}
              x={x(i)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              className="fill-slate-400 text-[9px]"
            >
              {p.label}
            </text>
          ),
      )}
    </svg>
  )
}
