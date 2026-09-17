import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

// Pakai 127.0.0.1 (bukan "localhost") supaya tidak kena isu resolusi ke IPv6 (::1) di
// Windows saat backend cuma listen di IPv4 — penyebab error "AggregateError at
// internalConnectMultiple" di proxy kalau target-nya "localhost".
const BACKEND_TARGET = 'http://127.0.0.1:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Versi aplikasi diambil dari package.json saat build, dipakai di footer (Layout.tsx) —
  // satu sumber kebenaran, tidak perlu update manual di 2 tempat tiap rilis.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // Proxy /api & /health ke backend supaya request tampak same-origin di browser
    // (menghindari CORS block, mis. backend belum izinkan method DELETE di preflight-nya).
    proxy: {
      '/api': { target: BACKEND_TARGET, changeOrigin: true },
      '/health': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        // "/health" juga dipakai sebagai route React Router (halaman HealthCheckPage).
        // Navigasi browser langsung (Accept: text/html) harus tetap dilayani index.html
        // biar SPA-nya render, bukan diproxy jadi JSON mentah dari backend — proxy cuma
        // untuk fetch() JS (client.ts) yang tidak minta text/html.
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
    },
  },
})
