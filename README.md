# Warehouse System — Frontend

Frontend untuk sistem manajemen warehouse multi-tenant (React 19 + TypeScript + Vite + Tailwind
CSS v4 + TanStack Query + React Router v7). Mencakup inventory (inbound/outbound/transfer/
opname), sales/purchase/return dengan HPP FIFO, dashboard, activity log, manajemen user &
assignment staff per warehouse, serta fitur operasional kasir penuh — scan barcode, sesi kasir/
shift, hold/resume transaksi, cetak struk Bluetooth ESC/POS, diskon & kembalian, dan import/
export item dari CSV/Excel.

**Live:** [wms.itpintar.co.id](https://wms.itpintar.co.id)

Riwayat pengembangan lengkap (24 fase) ada di [`docs/progress-log.md`](docs/progress-log.md).
Kontrak API & aturan bisnis ada di [`docs/api-documentation.md`](docs/api-documentation.md) dan
[`docs/frontend-integration-guide.md`](docs/frontend-integration-guide.md).

## Arsitektur

Terhubung ke **dua backend terpisah**:

| | Auth backend | Warehouse backend |
|---|---|---|
| Fungsi | Login, refresh token, user/BU | Semua data bisnis |
| Dev | `http://localhost:5020` (langsung) | `/api/*` (diproxy Vite dev server) |
| Produksi | `https://auth.itpintar.co.id` | `https://api-wms.itpintar.co.id` |

## Development

```bash
npm install
npm run dev        # http://localhost:5173, proxy /api ke warehouse-backend lokal (vite.config.ts)
npm run build       # type-check (tsc -b) + build produksi ke dist/
npm run lint
```

Butuh kedua backend jalan lokal (`:5020` dan `:3000`) — lihat repo masing-masing
(`itp-warehouse-backend`, sibling auth-backend). `.env` dev sudah kosong (`VITE_API_BASE_URL=`,
dipakai relatif lewat proxy); `.env.production` yang dipakai `npm run build` sudah diisi domain
produksi, tidak perlu diubah kecuali domainnya ganti.

## Deploy

Frontend ini **static SPA** (hasil `npm run build` di `dist/`) — di-serve nginx di VPS yang sama
dengan kedua backend, masing-masing subdomain sendiri (`wms`/`api-wms`/`auth`), TLS via Let's
Encrypt + Cloudflare di depannya. Detail lengkap (nginx config, CORS, dll) ada di komentar
[`deploy/nginx-wms.conf`](deploy/nginx-wms.conf) dan [`docs/progress-log.md`](docs/progress-log.md)
bagian deploy.

**Redeploy** (build baru → upload ke VPS) — satu command:

```bash
./deploy/redeploy.sh
```

Butuh SSH key `~/.ssh/warehouse_vps_deploy` (private, tidak ikut repo). Script-nya build,
bersihin `dist/` lama di VPS (ganti `rsync --delete` yang tidak tersedia di mesin dev ini),
upload yang baru, lalu verifikasi `https://wms.itpintar.co.id` balik `200`.
