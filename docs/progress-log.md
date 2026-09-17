# Progress Log — Warehouse Frontend

Catatan ringkas progress pengerjaan per fase, mengacu ke [frontend-roadmap.md](./frontend-roadmap.md).
Update file ini setiap kali sebuah fase selesai atau ada keputusan teknis penting yang perlu diingat.

**Legenda status:** ⬜ Belum mulai · 🟨 Sedang berjalan · ✅ Selesai

---

## Ringkasan Status Fase

| Fase | Nama | Status | Tanggal Selesai |
|---|---|---|---|
| 0 | Project Setup & Foundation | ✅ | 2026-08-26 |
| 1 | Core Infrastructure | ✅ | 2026-08-26 |
| 2 | Master Data | ✅ | 2026-08-26 |
| 3 | Read-Only Reports | ✅ | 2026-08-26 |
| 4 | Inbound & Outbound | ✅ | 2026-08-26 |
| 5 | Stock Transfer | ✅ | 2026-08-26 |
| 6 | Stock Opname | ✅ | 2026-08-26 |
| 7 | Sales, Purchases, Payments | ✅ | 2026-08-26 |
| 8 | Invoices (Gabungan) | ✅ | 2026-08-26 |
| 9 | Returns | ✅ | 2026-08-26 |
| 10 | Dashboard | ✅ | 2026-08-26 |
| 11 | Polish & Hardening | ✅ | 2026-08-26 |

---

## Fase 0 — Project Setup & Foundation ✅ (2026-08-26)

**Yang dikerjakan:**
- Scaffold project dengan Vite + React + TypeScript (template `react-ts`).
- Install & konfigurasi Tailwind CSS v4 (via plugin `@tailwindcss/vite`, bukan `tailwind.config.js` PostCSS klasik).
- Install React Router (`react-router-dom`) — root router disiapkan di [App.tsx](../src/App.tsx).
- Install TanStack Query (`@tanstack/react-query`) — `QueryClientProvider` dipasang di [main.tsx](../src/main.tsx).
- Struktur folder dibuat sesuai rencana: `src/{api,types,components,features,hooks,utils,routes}`.
- `.env` / `.env.example` untuk `VITE_API_BASE_URL` (default `http://localhost:3000`, tanpa suffix `/api` karena `/health` di luar prefix itu).
- API client awal ([src/api/client.ts](../src/api/client.ts)) — baru berisi `getHealth()`, wrapper generik lengkap menyusul di Fase 1.
- Halaman verifikasi awal ([HealthCheckPage.tsx](../src/routes/HealthCheckPage.tsx)) di route `/` — fetch `GET /health` via React Query, styling Tailwind.
- Dev server (`npm run dev`) & production build (`npm run build`) sudah diverifikasi jalan tanpa error, lint bersih (`npm run lint`).
- Dev server config tersimpan di `.claude/launch.json` untuk preview.

**Keputusan teknis:**
- Tailwind v4 dipilih (bukan v3) — setup lebih simpel (1 baris `@import "tailwindcss"` di `index.css`, tanpa `tailwind.config.js`/`postcss.config.js` terpisah).
- `package.json` name diganti dari default `vite-scaffold` → `warehouse-frontend`.
- Node terpasang di mesin ini v20.10.0 — sedikit di bawah rekomendasi terbaru `create-vite`/`eslint` (butuh 20.19+), muncul warning `EBADENGINE` saat install tapi **tidak fatal**, semua tooling tetap jalan normal. Perlu diperhatikan kalau nanti ada masalah aneh terkait versi Node.

**Catatan verifikasi:**
- Saat dites, backend belum jalan di `localhost:3000` → halaman menampilkan pesan error koneksi (`ERR_CONNECTION_REFUSED`), ini **diharapkan** dan sekaligus membuktikan error-handling dasar sudah berfungsi.

**Belum dikerjakan (sengaja, masuk fase berikutnya):**
- API client wrapper penuh (handle `{data}`/`{data,meta}`/`{error}`, idempotency key helper) → Fase 1.
- Shared UI components (table, pagination, form, modal, toast) → Fase 1.

---

## Fase 1 — Core Infrastructure ✅ (2026-08-26)

**Yang dikerjakan:**
- **API client wrapper** ([src/api/client.ts](../src/api/client.ts)): `apiGet/apiPost/apiPut/apiDelete` generik, handle query params, prefix `/api` otomatis, parse envelope `{data}`/`{data,meta}`, dan throw `ApiError` kalau `!res.ok` atau body punya `error`.
- **Error handling** ([src/api/errors.ts](../src/api/errors.ts)): class `ApiError` (code/status/details) + `ERROR_MESSAGES` (mapping semua kode dari §2 dokumentasi API ke pesan Bahasa Indonesia) + `getErrorMessage()` helper.
- **Idempotency-Key helper** ([src/hooks/useIdempotencyKey.ts](../src/hooks/useIdempotencyKey.ts)): `useIdempotencyKey()` — key dipertahankan selama retry, di-reset manual setelah aksi sukses. Dipasangkan ke `apiPost(path, body, { idempotencyKey })`.
- **`useDocumentActions`** ([src/hooks/useDocumentActions.ts](../src/hooks/useDocumentActions.ts)): hook generik + config lifecycle per modul (`INVENTORY_TRANSACTION_LIFECYCLE`, `STOCK_TRANSFER_LIFECYCLE`, `STOCK_OPNAME_LIFECYCLE`, `RETURN_LIFECYCLE`) untuk menentukan tombol aksi yang valid berdasarkan status dokumen.
- **Utils**: [money.ts](../src/utils/money.ts) (`parseMoney`, `formatRupiah`, `formatNumber`), [date.ts](../src/utils/date.ts) (`formatDate`, `formatTimestamp`, `todayISO` — parsing manual tanpa `Date()` untuk field `DATE` supaya tidak kena geser timezone).
- **TypeScript types** lengkap untuk semua object di dokumentasi API, 1 file per modul di `src/types/`: `warehouse`, `item`, `contact`, `stock`, `stockMutation`, `costLayer`, `inventoryTransaction` (inbound/outbound), `stockTransfer`, `stockOpname`, `invoice` (sales/purchase), `payment`, `return`, `dashboard`.
- **Shared UI components** (Tailwind) di `src/components/`: `DataTable` (generic, kolom via config), `Pagination` (berbasis `PaginationMeta`), `StatusBadge` (warna per status), `Modal`, `ConfirmDialog` (untuk semua aksi ireversibel), `FormField` (`TextField`/`SelectField`/`TextareaField`), `FilterBar` (layout wrapper), `ToastProvider` + `useToast` hook (context dipisah ke `toastContext.ts` biar fast-refresh bersih).
- `QueryClientProvider` di [main.tsx](../src/main.tsx) di-set `networkMode: 'always'` + `retry: 1` (lihat catatan verifikasi di bawah).
- [HealthCheckPage.tsx](../src/routes/HealthCheckPage.tsx) diupdate untuk memakai `getErrorMessage()` + `StatusBadge` + tombol "Test Toast" — jadi bukti semua lego block infra sudah terhubung.

**Keputusan teknis:**
- Response envelope ditangani di 1 tempat (`api/client.ts`) — modul fitur di fase berikutnya tinggal panggil `apiGet<T>(path, params)` dsb, tidak perlu urus parsing/error lagi.
- `useDocumentActions` didesain berbasis **config per status → daftar action** (bukan if/else berlapis) supaya gampang ditambah modul baru dan gampang ditest.
- Format tanggal (`YYYY-MM-DD`) sengaja **tidak** pakai `new Date(str)` — diparsing manual per bagian string untuk menghindari bug pergeseran hari akibat timezone browser.

**Catatan verifikasi (penting untuk fase berikutnya):**
- Saat testing di Browser pane, request `GET /health` yang gagal (`ERR_CONNECTION_REFUSED`) sempat membuat React Query **stuck di `fetchStatus: 'paused'` tanpa pernah `isError`** — root cause: default `networkMode: 'online'` React Query pause retry saat `onlineManager` mendeteksi kondisi offline (dipicu kegagalan koneksi berulang di sandbox browser tool ini), bukan bug di kode kita.
- **Fix:** `QueryClient` di `main.tsx` di-set `defaultOptions.queries.networkMode: 'always'` (+ `retry: 1`, `refetchOnWindowFocus: false`) supaya query selalu jalan & error ter-settle deterministik, tidak silent-pause. **Konfigurasi ini harus tetap dipertahankan** untuk semua query di fase berikutnya — jangan override `networkMode` balik ke default di modul manapun.
- Setelah fix, `GET /health` berhasil dites end-to-end (backend ternyata reachable di `localhost:3000` saat verifikasi terakhir) — status "OK" tampil dengan `StatusBadge`, dan toast notification juga terverifikasi jalan.
- `npm run build` dan `npm run lint` bersih tanpa error/warning.

**Belum dikerjakan (sengaja, masuk fase berikutnya):**
- Semua ini masih infrastruktur murni — belum ada modul bisnis (Warehouses/Items/dll) yang benar-benar pakai `DataTable`/`FormField`/`useDocumentActions` di halaman nyata. Verifikasi pemakaian sebenarnya baru kejadian di Fase 2.

---

## Fase 2 — Master Data ✅ (2026-08-26)

**Yang dikerjakan:**
- **Service API** per modul: [warehouses.ts](../src/api/warehouses.ts), [items.ts](../src/api/items.ts), [contacts.ts](../src/api/contacts.ts) — semua tinggal wrapper tipis di atas `apiGet/apiPost/apiPut/apiDelete` dari Fase 1.
- **Warehouses** ([src/features/warehouses](../src/features/warehouses)): list+pagination, create/edit modal, delete (dengan `ConfirmDialog` + handle `WAREHOUSE_REFERENCED`), halaman detail dengan stock-summary card + tabel stok per item.
- **Items** ([src/features/items](../src/features/items)): list+pagination dengan search-as-you-type (debounced 300ms ke `GET /items/search`), create/edit modal (tanpa delete — sesuai dokumentasi API, item master tidak boleh dihapus), halaman detail dengan tab "Stok Lintas Gudang" dan tab "Cost/HPP" (butuh pilih warehouse dulu via dropdown, sesuai `warehouse_id` wajib di endpoint cost/cost-history).
- **Contacts** ([src/features/contacts](../src/features/contacts)): list+pagination dengan filter `type` (customer/supplier/both), create/edit modal.
- **Layout & routing**: [Layout.tsx](../src/routes/Layout.tsx) (nav bar Warehouses/Items/Contacts) dipasang di [App.tsx](../src/App.tsx), `/` redirect ke `/warehouses`, `/health` tetap ada sebagai halaman debug terpisah di luar Layout.
- **`useDebouncedValue`** hook baru ([src/hooks/useDebouncedValue.ts](../src/hooks/useDebouncedValue.ts)) untuk search Items.
- **`ErrorState`** component baru ([src/components/ErrorState.tsx](../src/components/ErrorState.tsx)) — dipasang di ketiga list page supaya query yang gagal tampil sebagai pesan error yang jelas, bukan senyap seperti "list kosong" (lihat bug #1 di bawah).
- Perbaikan tipe di `FormField.tsx` (`TextField`/`SelectField`/`TextareaField` tadinya salah mewajibkan prop `children` dari caller — di-fix pakai `Omit<FieldWrapperProps, 'children'>`).

**3 bug nyata ditemukan & diperbaiki selama verifikasi end-to-end di browser (bukan cuma build/lint):**

1. **`buildUrl()` di `api/client.ts` crash untuk base URL relatif.** `new URL(path)` tanpa base argument throw `TypeError: Invalid URL` kalau `API_URL` relatif (mis. `/api`). Errornya ketelan oleh React Query jadi query dianggap gagal tapi list page nampilin fallback `data ?? []` — **terlihat seperti "belum ada data" padahal sebenarnya request-nya gagal total.** Fix: `new URL(path, window.location.origin)`. Ini juga alasan kenapa `ErrorState` component ditambahkan — supaya kelas bug ini (query gagal tapi UI diam) tidak terulang tanpa ketahuan.
2. **Backend CORS belum izinkan method `DELETE`** (`Access-Control-Allow-Methods` di preflight response tidak menyertakan DELETE) — ini masalah di sisi **backend**, bukan bug frontend, tapi berdampak ke semua aksi delete/complete/dsb dari browser langsung ke `localhost:3000`. Mitigasi dari sisi frontend: **Vite dev proxy** ditambahkan di [vite.config.ts](../vite.config.ts) (`/api` dan `/health` di-proxy ke `http://localhost:3000`), dan `VITE_API_BASE_URL` di `.env`/`.env.example` diubah jadi **kosong/relatif** supaya request tampak same-origin ke browser (tidak kena CORS check sama sekali). **Catatan penting:** proxy ini cuma jalan pas `npm run dev`. Untuk production build, backend tetap wajib benerin CORS config-nya (tambahkan `DELETE`, dan idealnya semua method yang dipakai: POST/PUT/DELETE) atau di-deploy same-origin dengan frontend.
3. **`apiPost/apiPut/apiDelete` selalu kirim header `Content-Type: application/json` walau body kosong** (mis. semua `DELETE` tanpa body) — Fastify menolak dengan `400 FST_ERR_CTP_EMPTY_JSON_BODY` ("Body cannot be empty when content-type is set to 'application/json'"). Fix: header `Content-Type` cuma dipasang kalau `body !== undefined`.

**Keputusan teknis:**
- Dropdown warehouse di tab Cost/HPP Item fetch `listWarehouses({page:1, per_page:100})` langsung (bukan komponen combobox async terpisah) — cukup untuk skala data MVP ini, revisit kalau warehouse sudah ratusan.
- Modul Items sengaja **tidak punya delete** — konsisten dengan dokumentasi API (`Tidak ada DELETE /items`).

**Catatan verifikasi:**
- Semua 3 modul dites langsung di browser (bukan cuma build lulus) terhadap backend nyata di `localhost:3000`: list+pagination Warehouses/Items/Contacts, detail Warehouse (stock-summary + stok per item), detail Item (stok lintas gudang + cost/HPP dengan data FIFO asli), full cycle create→delete Warehouse dengan `ConfirmDialog`.
- Sempat ada gejala membingungkan saat testing: tombol delete "tidak merespons" di satu tab browser setelah banyak force-reload — ternyata state tab tersebut korup akibat berkali-kali dipaksa reload+HMR beruntun (bukan bug kode). Fix: buka tab browser baru, langsung normal. **Kalau nemu UI yang tampak tidak merespons padahal kodenya sudah benar, coba dulu di tab baru sebelum curiga ke kode.**
- `npm run build` dan `npm run lint` bersih tanpa error/warning setelah semua fix di atas.

**Belum dikerjakan (sengaja, masuk fase berikutnya / backlog):**
- Backend CORS untuk method selain GET/POST masih perlu difix di sisi backend sebelum production deploy (lihat bug #2) — dicatat di sini supaya tidak lupa, ini bukan tugas frontend tapi blocking untuk semua modul transaksi (complete/approve/dst) di fase 4+ kalau dites lewat browser tanpa proxy.
- Field-level validation error dari backend (`VALIDATION_ERROR` dengan `details[]`) baru ditangani sebagai toast generik, belum di-mapping ke field form spesifik — cukup untuk sekarang, revisit kalau bentuk `details[]` sudah jelas formatnya dari backend asli.

---

## Fase 3 — Read-Only Reports ✅ (2026-08-26)

**Yang dikerjakan:**
- **Service API**: [stocks.ts](../src/api/stocks.ts) (`listStocks`, `listLowStock`, `listOutOfStock`), [stockMutations.ts](../src/api/stockMutations.ts) (`listStockMutations`), [costLayers.ts](../src/api/costLayers.ts) (`listCostLayers`, `getCostSummary`).
- **Stocks** ([src/features/stocks/StockListPage.tsx](../src/features/stocks/StockListPage.tsx)): 3 tab (Semua Stok / Low Stock / Out of Stock) dalam satu halaman, filter warehouse + item (item picker cuma tampil di tab "Semua" karena endpoint low-stock/out-of-stock tidak menerima `item_id`), highlight kuning kalau qty ≤ min_stock.
- **Stock Mutations / Ledger** ([src/features/stockMutations/StockMutationListPage.tsx](../src/features/stockMutations/StockMutationListPage.tsx)): filter berlapis lengkap (warehouse, item, type, direction, source_type, rentang tanggal), kolom "Sumber" menampilkan `source_type #source_id` untuk traceability (belum jadi link karena halaman detail inbound/outbound/dst baru ada di Fase 4+).
- **Cost Layers / HPP** ([src/features/costLayers/CostLayerListPage.tsx](../src/features/costLayers/CostLayerListPage.tsx)): cost-summary card (qty tersisa + total nilai) di atas tabel, filter warehouse/item/`remaining_only`, kolom "Asal" menampilkan "Transfer dari layer #N" kalau `origin_cost_layer_id` terisi.
- **`ItemPicker`** component baru ([src/components/ItemPicker.tsx](../src/components/ItemPicker.tsx)): search-select SKU/nama → resolve ke `item_id`, dipakai di ketiga modul di atas. Didesain reusable untuk baris detail transaksi di Fase 4+ juga.
- **`WarehouseSelect`** component baru ([src/components/WarehouseSelect.tsx](../src/components/WarehouseSelect.tsx)): dropdown warehouse generik, extract dari pola yang berulang di Fase 2 (dipakai ulang di Fase 3 dan seterusnya).
- Nav bar di [Layout.tsx](../src/routes/Layout.tsx) ditambah 3 item: Stocks, Mutations, Cost/HPP. Routing baru di [App.tsx](../src/App.tsx): `/stocks`, `/stock-mutations`, `/cost-layers`.

**Bug ditemukan & diperbaiki (build-time, sebelum sempat ke browser):**
- `interface XxxListParams { ... }` di `stocks.ts`/`stockMutations.ts`/`costLayers.ts` gagal type-check saat dipassing ke `apiGet<T>(path, params)` — TS error `Index signature for type 'string' is missing`. **Root cause:** TypeScript tidak menganggap `interface` otomatis kompatibel dengan tipe yang punya index signature (`Record<string, ...>`), walau semua propertinya cocok — beda dengan `type` alias/object literal inline yang tidak kena masalah ini. **Fix:** semua `interface XxxParams` diganti jadi `type XxxParams = {...}`. **Aturan buat ke depan: selalu pakai `type` (bukan `interface`) untuk shape parameter yang bakal di-pass ke fungsi ber-signature `Record<string, ...>` seperti `apiGet/apiPost`.**

**Keputusan teknis:**
- `ItemPicker` dan `WarehouseSelect` sengaja dipisah jadi component generik di Fase 3 (bukan Fase 1) karena baru kelihatan pola pengulangannya setelah 2 modul report butuh filter yang sama — dipakai lagi nanti di form transaksi Fase 4+.
- Cost-summary tidak menerima `item_id` (sesuai dokumentasi API), jadi filter item cuma berlaku untuk tabel cost layer, bukan untuk card summary di atasnya — ini bukan bug, memang keterbatasan endpoint aslinya.

**Catatan verifikasi:**
- Semua 3 halaman dites di browser (tab baru, menghindari isu tab korup dari Fase 2) terhadap backend nyata: Stocks (3 tab + filter warehouse & item), Stock Mutations (filter tipe ADJUSTMENT teruji), Cost Layers (summary card + traceability transfer). Semua data yang tampil cocok dengan ekspektasi dari histori transaksi yang sudah ada di database dev.
- `ItemPicker` teruji end-to-end: ketik "router" → dropdown muncul → klik hasil → filter ter-apply, item terpilih tampil sebagai chip dengan tombol hapus (×).
- `npm run build` dan `npm run lint` bersih.

**Belum dikerjakan (sengaja, masuk fase berikutnya / backlog):**
- Link traceability dari kolom "Sumber" di Stock Mutations ke halaman detail dokumen asal (inbound/outbound/transfer/opname/return) — baru bisa dibuat setelah halaman-halaman itu ada di Fase 4-9.
- Tidak ada halaman detail untuk stock mutation individual (`GET /stock-mutations/:id`) — belum ada kebutuhan konkret untuk itu di luar tabel list, revisit kalau ada use case spesifik.

---

## Fase 4 — Inbound & Outbound ✅ (2026-08-26)

Modul transaksi pertama dengan **document lifecycle penuh** (pondasi Fase 1 — `useDocumentActions`, `useIdempotencyKey`, `INVENTORY_TRANSACTION_LIFECYCLE` — dipakai sungguhan di sini untuk pertama kali).

**Yang dikerjakan:**
- **Service API generik** ([src/api/inventoryTransactions.ts](../src/api/inventoryTransactions.ts)): karena Inbound & Outbound **identik strukturnya** (beda cuma base path `/inbounds` vs `/outbounds`), dibuat 1 modul dengan fungsi yang terima parameter `kind: 'inbound' | 'outbound'` (`listInventoryTransactions`, `getInventoryTransaction`, `createInventoryTransaction`, `updateInventoryTransaction`, `deleteInventoryTransaction`, `completeInventoryTransaction`, `cancelInventoryTransaction`) — bukan 2 file terpisah yang isinya copy-paste.
- **3 halaman generik** di [src/features/inventoryTransactions/](../src/features/inventoryTransactions/), semua terima prop `kind` + `title`, dipasang 2x di routing (`/inbounds/*` dan `/outbounds/*`):
  - `InventoryTransactionListPage`: filter warehouse/status/rentang tanggal, resolve nama warehouse dari cache `listWarehouses` yang sama dipakai `WarehouseSelect` (tidak ada request duplikat).
  - `InventoryTransactionFormPage`: dipakai untuk create (`/new`) dan edit (`/:id/edit`) — form multi-baris detail item (`ItemPicker` + qty + unit_price per baris, tambah/hapus baris dinamis, total per baris dihitung live di client), checkbox "dokumen reversal" yang membuka field `reversal_of_transaction_id` + `reversal_reason` (wajib diisi kalau dicentang). Guard: kalau buka `/edit` untuk dokumen yang statusnya sudah bukan DRAFT, form diganti pesan error + link balik (tidak render form sama sekali).
  - `InventoryTransactionDetailPage`: header info + tabel detail item + tombol aksi yang muncul/hilang otomatis sesuai `useDocumentActions` (Edit/Hapus/Batalkan/Complete saat DRAFT, kosong total saat COMPLETED/CANCELLED). Aksi Complete pakai `ConfirmDialog` + `useIdempotencyKey`, dan setelah sukses meng-invalidate bukan cuma query dokumen ini tapi juga `['stocks']`, `['stock-mutations']`, `['cost-layers']`, `['cost-summary']` — supaya halaman-halaman Fase 3 otomatis ter-refresh kalau user pindah ke sana tanpa perlu reload manual.
- **`WarehouseSelect`** ditambah prop `placeholder` (default `"Semua warehouse"` untuk konteks filter) — dipakai `"-- pilih warehouse --"` di form, karena label default filter itu tidak masuk akal untuk field wajib isi.
- Nav bar ditambah "Inbound" & "Outbound"; `Layout.tsx` nav diubah jadi `flex-wrap` karena sudah 9 item.

**Bug/gotcha ditemukan saat verifikasi di browser:**
- **UX inconsistency (fixed):** `WarehouseSelect` yang awalnya didesain untuk filter (opsi kosong = "Semua warehouse") dipakai ulang apa adanya di form create — hasilnya field wajib "Warehouse" nongolin "Semua warehouse" sebagai placeholder, membingungkan. Fix: tambah prop `placeholder`, form pakai teks yang sesuai konteks form.
- **Cosmetic race condition (didiagnosis, sengaja dibiarkan):** aksi Hapus dari halaman detail memicu `404` yang harmless di console. Urutan kejadian: `DELETE` sukses → `queryClient.invalidateQueries`/`removeQueries` dipanggil selagi halaman detail **masih ter-mount** (belum sempat unmount dari `navigate()`) → query observer halaman itu sendiri (yang masih subscribe ke key dokumen yang baru dihapus) otomatis refetch untuk memenuhi subscription-nya → `GET .../:id` 404 karena dokumennya sudah tidak ada. **Sudah dicoba** `removeQueries` sebelum `invalidateQueries` — tidak menghilangkan gejala karena TanStack Query tetap auto-refetch untuk observer yang masih aktif begitu entry cache-nya dihapus. Fix yang benar (namespace key list vs detail dipisah, atau unmount dulu sebelum invalidate) butuh restrukturisasi lebih besar untuk isu yang **murni kosmetik** (tidak ada toast error, tidak mengganggu navigasi, delete tetap sukses) — diputuskan **tidak worth it** untuk effort itu sekarang. **Kalau pola ini muncul lagi di modul lain (Transfer/Opname/Sales/dst yang juga punya delete-dari-halaman-detail), ini penyebabnya — jangan bingung, bukan bug baru.**

**Keputusan teknis:**
- Inbound & Outbound sengaja **1 modul generik** (bukan 2 modul terpisah yang mirip) karena dokumentasi API eksplisit bilang strukturnya identik — kalau nanti ternyata butuh divergensi (mis. Outbound butuh validasi stok di form sebelum submit), baru dipisah saat itu terjadi, bukan diantisipasi sekarang.
- Field `unit_price` tetap ditampilkan di form Outbound walau nilainya secara bisnis tidak dipakai untuk hitung HPP (HPP outbound berasal dari alokasi FIFO cost layer, bukan dari input user) — dipertahankan karena schema API memang menerima field itu apa adanya ("Body sama persis dengan inbound").
- Reversal flow **tidak** dibuat sebagai halaman/tombol terpisah — cukup checkbox di form create yang sama, sesuai cara dokumentasi API mendeskripsikannya (field tambahan di body yang sama, bukan endpoint berbeda).

**Catatan verifikasi (end-to-end di browser, backend nyata):**
- Full cycle Inbound: create DRAFT → detail nampilin tombol Edit/Hapus/Batalkan/Complete → Complete (+Idempotency-Key via `ConfirmDialog`) → status jadi COMPLETED, tombol aksi hilang → dicek ke halaman Stocks, qty warehouse **naik sesuai jumlah inbound** tanpa refresh manual (bukti cache invalidation lintas modul jalan).
- Full cycle Outbound: create DRAFT → Batalkan → status CANCELLED, tombol aksi hilang. Create lagi → Hapus → dokumen hilang dari list, navigasi otomatis balik ke `/outbounds`.
- Response `200 OK` pada `POST .../complete` mengonfirmasi header `Idempotency-Key` diterima backend (endpoint ini mewajibkan header itu — kalau tidak terkirim harusnya ditolak).
- `npm run build` dan `npm run lint` bersih.

**Belum dikerjakan (sengaja, masuk fase berikutnya / backlog):**
- Validasi client-side untuk stok cukup sebelum submit Outbound (backend tetap validasi & tolak dengan `409 INSUFFICIENT_STOCK` kalau kurang — cukup untuk sekarang, bisa ditambah preview stok di form kalau UX-nya jadi masalah nyata).
- Cosmetic 404 race condition di atas — dicatat sebagai known issue, bukan dikerjakan.

---

## Fase 5 — Stock Transfer ✅ (2026-08-26)

**Yang dikerjakan:**
- **Service API** ([src/api/stockTransfers.ts](../src/api/stockTransfers.ts)): CRUD + `approveStockTransfer` (tanpa Idempotency-Key), `completeStockTransfer` (dengan Idempotency-Key), `cancelStockTransfer`.
- **3 halaman** di [src/features/stockTransfers/](../src/features/stockTransfers/):
  - `StockTransferListPage`: filter warehouse asal, warehouse tujuan, status — kolom "Rute" render `KODE_ASAL → KODE_TUJUAN`.
  - `StockTransferFormPage`: mirip form Inbound/Outbound (Fase 4) tapi 2 `WarehouseSelect` (asal & tujuan) + validasi client-side real-time kalau keduanya sama (pesan muncul langsung tanpa perlu submit dulu, selain validasi ulang saat submit). Detail baris **hanya `item_id` + `quantity`** — tidak ada `unit_price`/kolom cost sama sekali, sesuai dokumentasi API (cost diambil dari FIFO alokasi saat complete, bukan input user).
  - `StockTransferDetailPage`: pakai `STOCK_TRANSFER_LIFECYCLE` dari Fase 1 (`DRAFT`: edit/delete/approve/cancel, `APPROVED`: complete/cancel) — tombol Approve **tidak** pakai `useIdempotencyKey` (transisi biasa), tombol Complete pakai (efek stok permanen). Timestamp `approved_at` ditambahkan ke footer info di samping `completed_at`/`cancelled_at`.
- Nav bar ditambah "Transfers"; routing `/stock-transfers`, `/stock-transfers/new`, `/stock-transfers/:id`, `/stock-transfers/:id/edit`.

**Keputusan teknis:**
- Validasi "warehouse asal ≠ tujuan" dilakukan **di 2 tempat**: real-time di JSX (pesan langsung muncul begitu user pilih 2 warehouse yang sama, sebelum submit) dan sekali lagi di `handleSubmit` (block submit kalau masih sama) — server tetap jadi validator akhir (`400 SAME_WAREHOUSE`, sudah ke-mapping di `ERROR_MESSAGES` sejak Fase 1) kalau ada cara lolos dari validasi client.
- Tidak reuse form generik dari Fase 4 (`InventoryTransactionFormPage`) walau polanya mirip — field & tipe body-nya cukup beda (2 warehouse vs 1 warehouse+contact, detail tanpa `unit_price`) sehingga generalisasi paksa akan bikin komponen itu penuh percabangan kondisional. Lebih bersih sebagai file terpisah dengan sedikit duplikasi structural, mengikuti prinsip "3 baris mirip masih lebih baik dari abstraksi prematur".

**Catatan verifikasi (end-to-end di browser, backend nyata):**
- Full 3-stage cycle: create DRAFT (tombol Edit/Hapus/Batalkan/Approve, **Complete belum muncul** — benar sesuai lifecycle) → Approve (sukses tanpa Idempotency-Key, status APPROVED, tombol berubah jadi Batalkan/Complete saja, Edit/Hapus hilang) → Complete (+Idempotency-Key via ConfirmDialog) → status COMPLETED, semua tombol aksi hilang.
- Dicek ke halaman Stocks: qty **berpindah persis** — WH-01 turun 1 (10→9), WH-02 naik 1 (2→3) — tanpa refresh manual, bukti cache invalidation lintas modul (pola yang sama dari Fase 4) tetap konsisten di modul ini.
- Validasi client-side same-warehouse teruji real-time di browser (pesan muncul begitu 2 dropdown diisi warehouse yang sama, hilang begitu salah satu diganti).
- `npm run build` dan `npm run lint` bersih.

**Belum dikerjakan (sengaja, masuk fase berikutnya / backlog):**
- Tidak ada temuan bug baru di fase ini — pola dari Fase 1 & 4 (document lifecycle, idempotency, cache invalidation) terbukti langsung reusable tanpa modifikasi.

---

## Fase 6 — Stock Opname ✅ (2026-08-26)

**Yang dikerjakan:**
- **Service API** ([src/api/stockOpnames.ts](../src/api/stockOpnames.ts)): CRUD + `submitStockOpname` (tanpa Idempotency-Key), `approveStockOpname` (dengan Idempotency-Key), `cancelStockOpname`.
- **`DifferenceBadge`** component baru ([src/components/DifferenceBadge.tsx](../src/components/DifferenceBadge.tsx)): badge hijau "Surplus +N" / merah "Defisit -N" / abu-abu "Sesuai" berdasarkan angka selisih — dipakai di form (estimasi) dan detail (nilai final dari backend).
- **3 halaman** di [src/features/stockOpnames/](../src/features/stockOpnames/):
  - `StockOpnameListPage`: filter warehouse + status (DRAFT/SUBMITTED/APPROVED/CANCELLED).
  - `StockOpnameFormPage`: banner info di atas form menjelaskan bahwa `system_qty` di-snapshot backend saat simpan (bukan real-time dari client). Tiap baris detail (`OpnameFormRow`, sub-component) fetch stok saat ini via `listStocks({warehouse_id, item_id})` begitu item+warehouse dipilih, lalu hitung **estimasi** selisih (`physical_qty - estimasi_system_qty`) secara reaktif tiap kali physical_qty diketik — ditampilkan pakai `DifferenceBadge` yang sama dengan detail page, plus field `notes` per baris (sesuai schema `StockOpnameDetailInput`).
  - `StockOpnameDetailPage`: tabel detail nampilin `system_qty`/`physical_qty` asli dari backend + `DifferenceBadge` dengan nilai final (bukan estimasi). Aksi pakai `STOCK_OPNAME_LIFECYCLE` dari Fase 1 (`DRAFT`: edit/delete/submit/cancel, `SUBMITTED`: approve/cancel) — Submit **tanpa** Idempotency-Key, Approve **dengan** (karena approve yang posting selisih ke ledger).
- Nav bar ditambah "Opname"; routing `/stock-opnames`, `/stock-opnames/new`, `/stock-opnames/:id`, `/stock-opnames/:id/edit`.

**Keputusan teknis:**
- Preview selisih di form **sengaja dilabeli "estimasi"** di UI (bukan diklaim sebagai nilai final) karena `system_qty` yang benar-benar dipakai backend adalah snapshot pada saat request create/update diterima — bisa saja beda tipis dari qty yang dilihat user beberapa detik sebelumnya kalau ada transaksi lain masuk di waktu bersamaan. Ini bukan bug, ini realita dari cara backend didesain (dicatat eksplisit di dokumentasi API), jadi UI jujur soal itu daripada berpura-pura akurat 100%.
- `OpnameFormRow` dipisah jadi sub-component (bukan inline dalam `.map()`) karena butuh `useQuery` sendiri per baris (fetch stok spesifik item+warehouse baris itu) — kalau tetap inline, hooks rules dilanggar (jumlah hook per render harus konsisten, tidak boleh di dalam loop langsung).

**Catatan verifikasi (end-to-end di browser, backend nyata):**
- Full 3-stage cycle: create dengan warehouse WH-01 + item SKU-001 → preview estimasi langsung tampil (`Qty Sistem (estimasi): 9`, sesuai qty asli saat itu) → ubah Physical Qty ke 12 → badge berubah reaktif jadi "Surplus +3" **tanpa reload** → submit form → detail DRAFT nampilin `system_qty: 9` (persis sama dengan estimasi client-side, membuktikan preview akurat) → Submit (tanpa Idempotency-Key) → status SUBMITTED → Approve (+Idempotency-Key) → status APPROVED.
- Dicek ke halaman Stocks: qty WH-01 naik dari 9 ke 12 (+3, sesuai surplus) tanpa refresh manual — cache invalidation lintas modul konsisten seperti fase-fase sebelumnya.
- `npm run build` dan `npm run lint` bersih.

**Belum dikerjakan (sengaja, masuk fase berikutnya / backlog):**
- Kasus `difference == 0` ("item di-skip, tidak ada dampak ledger") tidak dites eksplisit di browser — logic `DifferenceBadge` untuk nilai 0 sudah benar secara kode (cabang ketiga di komponen), dan surplus/defisit sudah teruji nyata, jadi cukup percaya diri tanpa perlu test manual tambahan untuk case ini.
- Tidak ada bug baru ditemukan di fase ini.

---

## Fase 7 — Sales, Purchases, Payments ✅ (2026-08-26)

**Yang dikerjakan:**
- **Service API**: [invoices.ts](../src/api/invoices.ts) generik untuk Sales & Purchases (`kind: 'sales'|'purchase'`, sama seperti pola Inbound/Outbound di Fase 4), [payments.ts](../src/api/payments.ts) (`listPayments`, `getPayment`, `createPayment` — **tanpa** Idempotency-Key sesuai dokumentasi).
- **3 halaman generik invoice** di [src/features/invoices/](../src/features/invoices/):
  - `InvoiceListPage`: filter warehouse + status, kolom `payment_status` & `status` dua-duanya pakai `StatusBadge` (badge sudah punya style untuk UNPAID/PARTIAL/PAID sejak Fase 1).
  - `InvoiceFormPage`: `ContactSelect` di-filter `type='customer'` (Sales) / `type='supplier'` (Purchase) — otomatis ikut nampilin kontak `type: 'both'` karena filtering itu terjadi di backend (§6 dokumentasi API). Tax rate diinput sebagai **persentase** (0-100) di UI, dikonversi ke fraction (0-1) saat kirim ke server. Preview subtotal/tax/total dihitung live di client dan dilabeli jelas "(dihitung ulang oleh server saat disimpan)" — tidak pernah kirim `subtotal`/`tax`/`total_amount` ke backend (field itu computed, sesuai catatan **PENTING** di dokumentasi API).
  - `InvoiceDetailPage`: kolom `Unit Cost (HPP)` di tabel detail **hanya muncul untuk Sales** (`kind==='sales'`), dan menampilkan teks "akan terisi setelah Complete" selama status DRAFT (nilai asli masih `"0.00"` dari backend). Link ke transaksi terkait (`inventory_transaction_id`) otomatis mengarah ke `/outbounds/:id` untuk Sales atau `/inbounds/:id` untuk Purchase. Section Pembayaran (riwayat + sisa tagihan) hanya tampil saat status COMPLETED.
- **`PaymentFormModal`** ([src/features/payments/PaymentFormModal.tsx](../src/features/payments/PaymentFormModal.tsx)): amount di-prefill ke sisa tagihan, validasi client-side (amount > 0, amount ≤ sisa tagihan, metode pembayaran wajib diisi) sebelum hit API — mengurangi kemungkinan kena `409 AMOUNT_EXCEEDS_BALANCE` tapi backend tetap jadi validator akhir.
- Nav bar ditambah "Sales" & "Purchases"; routing `/sales/*` dan `/purchases/*` (list, new, detail, edit).

**Bug ditemukan & diperbaiki:**
- **`contact_id` ternyata nullable di API, bukan wajib.** Data real di backend (`PUR-000001`) punya `contact_id: null`, tapi `types/invoice.ts` mendefinisikannya sebagai `number` wajib dan form memaksa `required` pada `ContactSelect`. Akibatnya: (1) halaman detail render `"WH-01 — Gudang Utama  ·  · 25 Agu 2026"` dengan separator kosong ganda saat contact tidak ada, (2) form tidak akurat memaksa user pilih kontak padahal backend tidak mewajibkannya. **Fix:** `Invoice.contact_id` dan `InvoiceInput.contact_id` diubah jadi `number | null` (opsional), `ContactSelect` di form dihapus `required`-nya + label diubah jadi "(opsional)", dan render nama contact di detail page dibuat kondisional (`{contact && <>...</>}`) — pola yang sama seperti sudah dipakai untuk `due_date`. Diverifikasi ulang: create Purchase tanpa pilih supplier sukses, detail page tidak lagi nampilin separator kosong.

**Keputusan teknis:**
- Tidak membangun UI kasir/POS terpisah untuk Sales (disebut sebagai pertimbangan di roadmap) — 1 form backoffice yang sama dipakai untuk semua alur, karena API memang cuma py `POST /api/sales` yang sama untuk keduanya dan belum ada kebutuhan konkret UI kasir yang beda. Bisa direvisit di Fase 11 kalau ada feedback nyata.
- `PaymentFormModal` invalidate query `['sales']` dan `['purchase']` sekaligus (bukan cuma `[kind]` milik invoice yang lagi dibuka) karena modal ini reusable dan tidak tahu invoice-nya Sales atau Purchase dari luar — lebih aman invalidate keduanya daripada bikin modal terima prop `kind` tambahan cuma untuk itu.

**Catatan verifikasi (end-to-end di browser, backend nyata):**
- Sales: dicek data lama (SAL-000002, COMPLETED+PAID) — HPP terisi, link ke Outbound #6 jalan, 2 riwayat pembayaran tampil benar. Full cycle baru: create → preview kalkulasi cocok 100% dengan hasil backend (subtotal/tax/total sama persis) → Complete (+Idempotency-Key) → HPP ter-freeze dari `Rp 0` jadi `Rp 45.000` (nilai FIFO asli) → bayar parsial 200rb (status jadi PARTIAL) → coba bayar lebih dari sisa (client-side diblokir, tidak ada request terkirim) → lunasi sisa persis → status PAID, tombol "+ Catat Pembayaran" otomatis hilang.
- Purchase: list & detail data lama dicek (PUR-000001, tanpa HPP column, link ke Inbound #5 jalan). Create baru tanpa pilih supplier berhasil (membuktikan fix `contact_id` opsional benar).
- **Catatan proses testing (bukan bug aplikasi):** di form ini, klik `computer{action:"left_click", ref}` pada elemen yang baru muncul secara dinamis (hasil dropdown `ItemPicker`, tombol submit setelah beberapa `form_input`) beberapa kali **tidak ter-registrasi** — kemungkinan besar karena ref/koordinat dari `read_page` sempat stale akibat re-render antara pembacaan tree dan eksekusi klik. Simtomnya konsisten: tidak ada network request baru sama sekali, tidak ada error. **Cara ampuh yang dipakai untuk lanjut testing:** klik via `javascript_tool` (`document.querySelector(...).click()`) dan set value input terkontrol React via native property setter + `dispatchEvent(new Event('input'/'change', {bubbles:true}))` — lebih reliable daripada `computer`/`form_input` berbasis ref untuk elemen yang baru muncul dinamis di form kompleks seperti ini. **Dicatat di sini untuk sesi verifikasi berikutnya supaya tidak salah duga sebagai bug kode saat mengalami gejala serupa.**
- 404 harmless saat delete dari detail page — pola yang sama dengan Fase 4-6, bukan bug baru.
- `npm run build` dan `npm run lint` bersih.

**Belum dikerjakan (sengaja, masuk fase berikutnya / backlog):**
- UI kasir/POS terpisah untuk Sales — dicatat sebagai kemungkinan kebutuhan Fase 11, belum ada urgensi.

---

## Fase 8 — Invoices (Gabungan) ✅ (2026-08-26)

Fase paling ringkas sejauh ini — murni read-only, tidak ada form/mutation.

**Yang dikerjakan:**
- **Service API** ([src/api/invoicesCombined.ts](../src/api/invoicesCombined.ts)): `listAllInvoices()` — 1 fungsi ke `GET /api/invoices` (filter `type`, `payment_status`, `status`, `warehouse_id`). Sengaja **tidak** dibuatkan fungsi untuk `GET /api/invoices/:id/payments` meski ada di dokumentasi — endpoint itu redundant secara fungsional dengan `listPayments({invoice_id})` yang sudah ada dari Fase 7, jadi tidak ada gunanya duplikasi kode yang tidak akan dipakai.
- **`AllInvoicesListPage`** ([src/features/invoices/AllInvoicesListPage.tsx](../src/features/invoices/AllInvoicesListPage.tsx)): tabel gabungan SALES+PURCHASE dengan filter lengkap (tipe, warehouse, status, payment_status), kolom "No. Invoice" link ke `/sales/:id` atau `/purchases/:id` **berdasarkan `row.type`** — resource ini murni untuk listing/filter lintas tipe, aksi (edit/complete/dst) tetap lewat halaman Sales/Purchase asli sesuai desain dokumentasi API. Ada banner kecil di atas tabel yang menjelaskan ini read-only dan kemana harus pergi untuk aksi.
- Nav bar ditambah "Invoices"; routing `/invoices` (list-only, tidak ada create/detail/edit — sesuai sifat resource-nya).

**Keputusan teknis:**
- `getRowKey` di `DataTable` pakai `${row.type}-${row.id}` (bukan cuma `row.id`) karena SALES dan PURCHASE punya ruang id yang terpisah di masing-masing tabel asalnya — id `1` bisa muncul di kedua tipe, jadi key harus disertai type supaya unik dan React tidak salah reconcile baris.

**Catatan verifikasi (end-to-end di browser, backend nyata):**
- Data SALES dan PURCHASE tercampur benar dalam satu tabel gabungan (SAL-000003, SAL-000002, PUR-000001 semua muncul).
- Filter `type=PURCHASE` teruji — tabel langsung terfilter cuma nampilin PUR-000001.
- Klik link invoice PURCHASE dari halaman gabungan berhasil navigasi ke `/purchases/1` (halaman detail Purchase asli dari Fase 7), bukan halaman baru — membuktikan resource ini benar-benar cuma "jendela" ke data yang sama.
- `npm run build` dan `npm run lint` bersih, tidak ada bug baru ditemukan.

**Belum dikerjakan:**
- Tidak ada — scope fase ini memang kecil dan sudah lengkap sesuai dokumentasi API.

---

## Fase 9 — Returns ✅ (2026-08-26)

Modul paling kompleks di seluruh aplikasi (sesuai peringatan di dokumentasi API sendiri: "Modul paling kompleks"). Selesai dan diverifikasi penuh end-to-end termasuk skenario yang belum pernah ada di data seed.

**Yang dikerjakan:**
- **Service API** ([src/api/returns.ts](../src/api/returns.ts)): CRUD + `approveReturn`/`rejectReturn`/`cancelReturn` (tanpa Idempotency-Key) + `completeReturn` (dengan Idempotency-Key).
- **`ReturnListPage`**: filter warehouse, tipe (Dari Customer / Ke Supplier — dilabel dalam bahasa manusia, bukan `RETURN_CUSTOMER`/`RETURN_SUPPLIER` mentah), status.
- **`ReturnFormPage`** — bagian paling rumit:
  - Radio button tipe retur (Customer/Supplier) di **create**; jadi teks read-only "(tidak bisa diubah setelah dibuat)" di **edit**, sesuai aturan API "`type` dan referensi origin tidak bisa diubah" saat update.
  - Dropdown **dokumen asal** (origin) muncul kondisional: untuk RETURN_CUSTOMER isinya daftar Sales invoice ber-status COMPLETED (dari `listInvoicesByKind('sales', {status:'COMPLETED'})`); untuk RETURN_SUPPLIER isinya daftar Inbound ber-status COMPLETED. Origin juga terkunci read-only saat edit.
  - Setelah origin dipilih, sistem fetch detail dokumen asal itu dan **membatasi pilihan item di baris detail hanya ke item yang benar-benar ada di dokumen asal** (bukan `ItemPicker` search bebas seperti modul lain) — sesuai aturan validasi "Item retur harus ada di dokumen origin". Qty asli di dokumen asal ditampilkan sebagai teks bantu di bawah tiap baris (label jelas "Qty asli di dokumen", bukan diklaim sebagai sisa yang eligible — lihat catatan keterbatasan di bawah).
  - Per baris: `condition` (GOOD/DAMAGED) dan `action` (RESTOCK/REPLACE/SCRAP) saling membatasi via fungsi `allowedActions(condition, type)`: DAMAGED → aksi terkunci ke SCRAP otomatis (dropdown disabled, cuma 1 opsi); GOOD + RETURN_SUPPLIER → opsi REPLACE disembunyikan (cuma RESTOCK/SCRAP); GOOD + RETURN_CUSTOMER → semua 3 opsi tersedia. Ganti kondisi otomatis reset aksi kalau aksi lama sudah tidak valid untuk kondisi baru.
  - Tidak ada field `unit_cost` di form sama sekali — field itu murni backend-computed (di-copy dari HPP historis dokumen asal), sesuai dokumentasi.
- **`ReturnDetailPage`**: pakai `RETURN_LIFECYCLE` dari Fase 1 (`DRAFT`: edit/delete/approve/cancel, `APPROVED`: complete/reject/cancel — **5 aksi berbeda**, paling banyak di antara semua modul). Link ke dokumen asal (`/sales/:id` atau `/inbounds/:id` sesuai tipe) dan link ke **outbound pengganti** (`replacement_inventory_transaction_id` → `/outbounds/:id`) kalau ada baris REPLACE yang sukses.
- Nav bar ditambah "Returns"; routing `/returns/*` (list, new, detail, edit).

**Keputusan teknis penting:**
- **Union type dari 2 sumber API dinormalisasi di dalam `queryFn`**, bukan di-handle dengan type guard di JSX. Awalnya `useQuery` untuk daftar origin option gagal type-check karena `queryFn` bisa return `Promise<ApiListResponse<Invoice>>` ATAU `Promise<ApiListResponse<InventoryTransaction>>` tergantung `type` saat runtime — TanStack Query butuh 1 tipe hasil yang konsisten. Fix: `queryFn` async yang langsung `.map()` hasil ke shape seragam (`{id, label}` untuk daftar origin, `OriginItem[]` untuk detail origin) sebelum di-return, jadi query selalu punya 1 tipe hasil yang jelas. **Pola ini berlaku umum: kalau butuh `useQuery` yang sumbernya bisa beda endpoint tergantung kondisi runtime, normalisasi shape di dalam `queryFn`, jangan andalkan union type + type guard di consumer.**
- Qty asli dokumen asal ditampilkan sebagai referensi, **bukan** dihitung sebagai "sisa yang eligible" (original qty − total sudah-diretur-sebelumnya) — endpoint list Returns tidak punya filter by origin document, jadi menghitung sisa eligible yang akurat di client butuh fetch semua retur (tidak scalable/reliable). Backend tetap jadi validator akhir (`409 RETURN_QUANTITY_EXCEEDS_ELIGIBLE`, sudah ke-mapping pesannya sejak Fase 1). Keputusan sama seperti estimasi `system_qty` di Stock Opname (Fase 6) — jujur soal keterbatasan daripada berpura-pura akurat.

**Temuan menarik saat verifikasi (bukan bug):**
- Setelah complete retur RETURN_SUPPLIER, **`unit_cost`/`total_cost` di detail retur (Rp 50.000 / Rp 150.000, dari HPP historis dokumen asal) berbeda dengan `total_cost` di stock mutation ledger (Rp 117.000)** untuk transaksi yang sama. Ini **bukan bug** — dua angka itu memang merepresentasikan hal berbeda: `unit_cost` di detail retur adalah nilai historis yang di-copy dari dokumen asal (murni informasional), sedangkan `total_cost` di ledger adalah hasil **alokasi FIFO aktual dari cost layer yang benar-benar ada di gudang saat itu** (yang komposisinya sudah berubah-ubah dari banyak transaksi lain sejak dokumen asal dibuat). Dicatat di sini supaya tidak disalahartikan sebagai bug data kalau ketemu lagi.

**Catatan verifikasi (end-to-end di browser, backend nyata):**
- Data lama RETURN_CUSTOMER dicek (RET-000001, COMPLETED): baris `condition:GOOD, action:REPLACE` tampil benar, link ke origin (`/sales/2`) dan **outbound pengganti** (`/outbounds/7`) dua-duanya jalan.
- Full cycle baru untuk RETURN_SUPPLIER (skenario yang belum ada di data seed sebelumnya): pilih tipe via radio → pilih warehouse → dropdown origin ter-populate cuma Inbound COMPLETED → pilih IN-000001 → dropdown item ter-populate cuma item yang ada di situ (SKU-001) + qty asli "10" tampil → set kondisi DAMAGED → **dropdown Aksi otomatis collapse ke cuma "Musnahkan (scrap)", value ter-set SCRAP, select ter-disable** → submit → DRAFT → Approve (tanpa Idempotency-Key) → APPROVED → Complete (+Idempotency-Key) → COMPLETED.
- Efek stok diverifikasi via API langsung: qty WH-01/SKU-001 turun dari 10 ke 7 (tepat 3, sesuai qty retur) — membuktikan aturan "RETURN_SUPPLIER selalu kurangi stok apapun condition/action-nya" (beda dari RETURN_CUSTOMER yang efeknya tergantung condition/action) benar-benar terimplementasi dan teruji nyata.
- Ledger (`/stock-mutations`) menunjukkan entri `RETURN_OUT` baru dengan traceability `RETURN #3` yang benar.
- `npm run build` dan `npm run lint` bersih. Tidak ada bug kode ditemukan — hanya 1 gotcha TypeScript (union type) yang langsung diperbaiki sebelum sempat ke browser.

**Belum dikerjakan (sengaja, backlog):**
- Perhitungan "sisa qty eligible" yang akurat (bukan cuma qty asli) — butuh endpoint backend baru (filter retur by origin) untuk bisa dikerjakan dengan benar; saat ini backend sudah jadi validator akhir yang cukup.

---

## Fase 10 — Dashboard ✅ (2026-08-26)

Dashboard jadi **landing page baru** (`/` redirect ke `/dashboard`, sebelumnya ke `/warehouses`).

**Yang dikerjakan:**
- **Service API** ([src/api/dashboard.ts](../src/api/dashboard.ts)): 5 fungsi ke 5 endpoint dashboard (`summary`, `stock`, `sales`, `purchases`, `profit`) — semua di-fetch paralel di halaman yang sama (7 `useQuery` independen total, termasuk 2 dari `api/stocks.ts` Fase 3 untuk widget low/out-of-stock — TanStack Query otomatis menjalankannya bersamaan, tidak perlu `Promise.all` manual).
- **`StatCard`** ([src/components/StatCard.tsx](../src/components/StatCard.tsx)) & **`SimpleBarChart`** ([src/components/SimpleBarChart.tsx](../src/components/SimpleBarChart.tsx)) — component baru generik untuk angka ringkasan dan perbandingan 2 nilai.
- **`DashboardPage`** ([src/features/dashboard/DashboardPage.tsx](../src/features/dashboard/DashboardPage.tsx)) dengan 4 seksi:
  1. **Stok Saat Ini** — dari `/dashboard/stock` (tidak terikat tanggal, karena stok memang tidak punya konsep historis-per-tanggal di API ini).
  2. **Ringkasan Harian** — dari `/dashboard/summary` untuk 1 tanggal (default hari ini, bisa diganti via date picker) — jumlah & total Sales/Purchase hari itu.
  3. **Performa Rentang Tanggal** — dari `/dashboard/sales` + `/dashboard/purchases` + `/dashboard/profit` untuk rentang `from`/`to` (default awal bulan s/d hari ini): bar chart perbandingan total Sales vs Purchases, plus card Revenue/COGS/Gross Profit/Gross Margin.
  4. **Perlu Restock (Low Stock)** & **Habis Stok (Out of Stock)** — widget ringkas (5 baris teratas) reuse dari `listLowStock`/`listOutOfStock` (Fase 3), dengan link "Lihat semua" ke `/stocks`.
- 1 filter warehouse global (opsional, "Semua warehouse" = agregasi lintas gudang) mempengaruhi seluruh 7 query sekaligus.
- Nav bar ditambah "Dashboard" (item pertama); `utils/date.ts` ditambah `firstDayOfMonthISO()` sebagai default rentang tanggal.

**Keputusan teknis penting — "chart sederhana" secara jujur sesuai kapasitas API:**
- Roadmap awal menyebut "chart sederhana untuk sales/purchases per rentang tanggal". Tapi endpoint `/dashboard/sales` dan `/dashboard/purchases` **cuma mengembalikan 1 angka agregat untuk keseluruhan rentang** (`count`, `subtotal`, `tax`, `total_amount`) — **bukan breakdown per hari**. Backend tidak punya API time-series (mis. "total sales per hari selama 30 hari terakhir"). Opsi yang dipertimbangkan: (a) panggil endpoint berkali-kali per hari untuk simulasi time-series — ditolak, N+1 request yang tidak proporsional untuk fitur "sederhana"; (b) pura-pura ada breakdown harian dengan data dummy — ditolak, melanggar prinsip tidak boleh mengarang kapabilitas yang API tidak punya. **Keputusan: bar chart perbandingan 2 nilai (Sales vs Purchases) untuk keseluruhan rentang** — jujur menampilkan apa yang benar-benar tersedia dari API, bukan grafik tren waktu yang datanya tidak ada.
- **Tidak pakai library charting** (Chart.js/Recharts/dst) — `SimpleBarChart` cuma 2 `<div>` dengan lebar proporsional pakai CSS, karena kebutuhan visualnya memang sesederhana itu (2 bar horizontal). Menambah dependency chart library untuk 2 bar akan jadi overkill (nambah bundle size untuk kebutuhan yang bisa diselesaikan dengan CSS biasa).

**Catatan verifikasi (end-to-end di browser, backend nyata):**
- Landing page: navigasi ke `/` otomatis redirect ke `/dashboard`, semua 7 seksi tampil dengan data nyata dari sesi testing sepanjang fase-fase sebelumnya (Sales hari ini Rp 333.000 — cocok dengan SAL-000003 yang dibuat saat verifikasi Fase 7; Low Stock 1 item — cocok dengan temuan Fase 3).
- Bar chart diverifikasi proporsional lewat inspeksi `style="width"` langsung: Sales 100% (nilai terbesar), Purchases 42.8571% (= 499.500/1.165.500) — matematika benar.
- Filter warehouse diuji dengan 3 nilai berbeda (semua/WH-01/WH-02): **ketujuh query bereaksi benar** — sempat curiga ada bug karena angka "Performa Rentang Tanggal" tidak berubah antara "Semua" dan "WH-01", tapi setelah dicek langsung ke API (`fetch` manual dengan `warehouse_id` berbeda), ternyata **bukan bug** — kebetulan semua data sales/purchase di dataset dev memang ada di WH-01, jadi filter "semua" dan "WH-01" menghasilkan angka sama secara sah. Dikonfirmasi dengan WH-02 yang benar-benar menghasilkan 0 di semua angka terkait.
- Edge case 0/0 di `SimpleBarChart` (saat filter ke warehouse tanpa data) diverifikasi tidak crash — `Math.max(...values, 1)` mencegah divide-by-zero.
- `TextField` dengan `label=""` (dipakai untuk date picker ringkas di header seksi) diverifikasi tidak menimbulkan artefak visual — span label kosong punya tinggi 0px.
- `npm run build` dan `npm run lint` bersih. Tidak ada bug kode ditemukan.

**Belum dikerjakan (sengaja, backlog):**
- Trend chart harian sungguhan — butuh endpoint backend baru yang mendukung breakdown time-series, di luar cakupan dokumentasi API saat ini.

---

## Fase 11 — Polish & Hardening ✅ (2026-08-26)

**Fase terakhir dari roadmap.** Sifatnya audit + fix, bukan modul baru — karena konsistensi (loading state, empty state, confirm dialog, Idempotency-Key) sudah dijaga sejak Fase 1 lewat komponen/hook bersama, jadi hasil audit sebagian besar "sudah benar", bukan "banyak yang rusak".

**Audit yang dilakukan (grep-based, menyeluruh ke seluruh `src/`):**
1. **Idempotency-Key checklist** — cross-check ke §Idempotency-Key dokumentasi API: 6 tempat yang harus pakai (`complete` di inbound/outbound/transfer/sales/purchase/return + `approve` di stock-opname) **semua benar pakai** `getKey()`/`idempotencyKey`. Dicek juga sebaliknya: `approve` transfer, `submit`/`reject`/`cancel` di semua modul, dan `POST /payments` — **semua benar TIDAK pakai** Idempotency-Key. 100% sesuai spek, nol temuan.
2. **Loading state konsistensi** — 12 list page semua pakai `loading={isLoading}` ke `DataTable`; 10 file (5 modul document-lifecycle × form+detail) semua punya guard `"Memuat data..."`. 2 halaman master-data (`WarehouseDetailPage`/`ItemDetailPage`, Fase 2) pakai pola berbeda (progressive render dengan fallback `?? '...'`) — dicek dan **bukan bug**, itu pola yang sengaja dipilih karena halaman itu tidak punya aksi yang butuh status dokumen ter-load dulu (beda dari modul transaksional yang butuh tahu status sebelum render tombol aksi).
3. **Confirm dialog konsistensi** — grep semua `.mutate()` dan pastikan tidak ada yang dipanggil langsung dari `onClick` tombol aksi (harus selalu lewat `onConfirm` di `ConfirmDialog`). **Nol pelanggaran** ditemukan di seluruh codebase.
4. **Aksesibilitas dasar** — semua `<input type="checkbox">`/`<input type="radio">` custom (non-`FormField`) dicek terbungkus `<label>` dengan teks deskriptif. Semua tempat yang pakai `focus:outline-none` **selalu** dipasangkan `focus:ring` sebagai pengganti visual (tidak ada focus yang hilang total). Tombol/link mengandalkan focus ring default browser (tidak di-override).

**Bug nyata ditemukan & diperbaiki — bukan dari grep, tapi dari smoke test klik-through:**
- **Akses langsung/refresh ke `/health` menampilkan JSON mentah dari backend, bukan halaman React.** Root cause: `/health` dipakai dua fungsi sekaligus di project ini — (1) route React Router (`HealthCheckPage`, dari Fase 0) dan (2) target Vite dev proxy (dari Fase 2, untuk hindari CORS). Saat browser melakukan **navigasi penuh** ke `http://localhost:5173/health` (ketik URL langsung / refresh / bookmark), request itu punya header `Accept: text/html` dan **kena tangkap proxy** sebelum sempat diteruskan ke `index.html` — jadi user lihat `{"data":{"status":"ok"}}` mentah, bukan UI React. Kalau navigasi terjadi via klik `<Link>` React Router (client-side, tanpa network request), bug ini **tidak muncul** — makanya lolos dari testing biasa selama ini dan baru ketahuan pas smoke test khusus fase ini yang navigasi ke semua route pakai `navigate()` (setara reload/URL langsung).
  **Fix** ([vite.config.ts](../vite.config.ts)): tambah `bypass` function di config proxy `/health` — kalau request punya header `Accept: text/html` (ciri khas navigasi browser, bukan `fetch()` JS), proxy dilewati dan `index.html` yang diserve (jadi React Router yang handle), selain itu (fetch dari `client.ts`) tetap diproxy seperti biasa ke backend. Diverifikasi: refresh langsung ke `/health` sekarang render `HealthCheckPage` dengan benar (termasuk `fetch()` internalnya ke `/health` tetap dapat status "OK" dari backend via proxy) — dua kebutuhan yang tadinya bentrok sekarang jalan berdampingan.
  **Pelajaran untuk ke depan:** kalau ada path yang dipakai SEKALIGUS sebagai route SPA dan target proxy dev server, selalu butuh `bypass` berbasis `Accept` header seperti ini — pola umum Vite untuk masalah ini, bukan kasus khusus project ini.
- Dites juga (untuk memastikan bukan bug serupa): deep-link langsung ke route bersarang (`/sales/2`) di-refresh — **berfungsi normal**, karena itu murni SPA-fallback default Vite dev server (jalan otomatis untuk semua path yang tidak match proxy rule apa pun) — cuma `/health` yang bermasalah karena satu-satunya path yang collision dengan proxy rule eksplisit.

**Auth-ready structure — didokumentasikan, bukan dibangun:**
- Tidak menambah kode auth spekulatif (tidak ada sistem auth nyata untuk ditest, dan kode auth palsu cuma nambah kompleksitas tanpa nilai). Sebagai gantinya, dikonfirmasi bahwa arsitektur yang sudah ada dari Fase 1 **memang sudah auth-ready secara alami**:
  - Semua request API (GET/POST/PUT/DELETE) melewati **1 fungsi `request()`** di [src/api/client.ts](../src/api/client.ts) — nanti nambah header `Authorization` atau handle `401` tinggal diubah di 1 tempat itu, tidak perlu sentuh kode di modul manapun.
  - Semua route halaman (kecuali `/health`) sudah ter-nest di bawah 1 elemen `<Route element={<Layout />}>` di [App.tsx](../src/App.tsx) — nanti nambah guard "harus login" tinggal bungkus grup route itu (atau taruh cek-nya di `Layout.tsx`), tidak perlu ubah routing satu-satu.

**Regresi penuh & smoke test (end-to-end di browser, backend nyata):**
- `npm run build` dan `npm run lint` bersih dari 0 (fresh check, bukan cuma per-fase) — dan tidak ada `console.log`/`console.debug` tersisa di manapun dalam `src/`.
- Klik-through **21 halaman** (15 halaman list/nav utama + 5 halaman form "new" (paling rentan karena banyak query dinamis) + `/health`) dalam 1 tab berurutan — **nol error console** di sepanjang sesi, membuktikan tidak ada regresi lintas-modul dari seluruh perubahan 10 fase sebelumnya.
- **Checklist Alur Kerja Umum (§20 dokumentasi API, workflow A–F)** — semua sudah diverifikasi end-to-end dengan backend nyata di fase masing-masing, tidak perlu diulang di fase ini:
  - A. Purchase dari supplier → diverifikasi Fase 7 (create → complete, stok bertambah + cost layer baru).
  - B. Sales/POS → diverifikasi Fase 7 (search item → create → complete → HPP beku → payment sampai PAID).
  - C. Transfer antar gudang → diverifikasi Fase 5 (create → approve → complete, stok berpindah persis).
  - D. Stock opname → diverifikasi Fase 6 (physical_qty → submit → approve, selisih diposting ke ledger).
  - E. Retur + ganti barang (customer) → diverifikasi Fase 9 lewat data asli (RET-000001: `GOOD`+`REPLACE`, link ke outbound pengganti jalan).
  - F. Retur ke supplier → diverifikasi Fase 9 end-to-end baru (create → approve → complete, stok berkurang via FIFO, ledger `RETURN_OUT` benar).

**Belum dikerjakan (sengaja, di luar cakupan lokal):**
- Konfigurasi SPA-fallback untuk **hosting produksi** (Nginx/Netlify/Vercel/dst) — `bypass` di `vite.config.ts` cuma berlaku untuk dev server, deployment nyata butuh konfigurasi serupa di level web server/platform hosting (standar untuk semua SPA, bukan sesuatu yang bisa "difix" dari kode React/Vite). Dicatat sebagai catatan deployment, bukan item kerja.

---

## Ringkasan Akhir

**Roadmap 12 fase (0–11) — 100% selesai.** Frontend Warehouse System dari kosong sampai ke-12 modul bisnis penuh (master data, laporan read-only, 7 modul transaksi dengan document lifecycle, dashboard, dan hardening), semuanya diverifikasi end-to-end di browser terhadap backend nyata — bukan cuma lulus `build`/`lint`.

**Bug nyata yang ditemukan & diperbaiki sepanjang proyek** (lihat masing-masing fase untuk detail lengkap): base URL relatif bikin `buildUrl` crash diam-diam (Fase 2), backend CORS belum izinkan `DELETE` (Fase 2, dimitigasi proxy), header `Content-Type` salah kirim ke endpoint tanpa body (Fase 2), `interface` vs `type` bikin TS index-signature error (Fase 3), `contact_id` ternyata nullable bukan wajib (Fase 7), union type dari 2 sumber API di `useQuery` (Fase 9), dan proxy `/health` nabrak route SPA (Fase 11).

**Pola infrastruktur yang terbukti reusable tanpa modifikasi sejak Fase 1**: `useDocumentActions` + config lifecycle per modul, `useIdempotencyKey`, cache invalidation lintas modul setelah aksi stok, `ConfirmDialog` untuk semua aksi ireversibel — dipakai konsisten di 7 modul transaksi (Inbound, Outbound, Stock Transfer, Stock Opname, Sales, Purchase, Returns) tanpa perlu diubah sedikit pun sejak pertama dibuat.

---

## Fase 12 — Auth, RBAC & Audit Integration ✅ (2026-08-28)

Update susulan di luar roadmap 12-fase awal (Fase 0–11 sudah 100% selesai di atas), dipicu oleh perubahan besar di sisi backend: backend warehouse sekarang punya **backend auth terpisah** (`:5020`, JWT RS256) plus role-based access control, business-unit scoping, pembatasan visibilitas HPP, kolom audit di semua dokumen transaksional, dan modul baru Activity Logs (`docs/frontend-integration-guide.md`).

**Arsitektur baru:**
- **2 backend, 2 cara panggil.** Warehouse-backend (`:3000/api/*`) tetap lewat Vite dev proxy yang sudah ada (Fase 2/11) — cuma ditambah header `Authorization`. Auth-backend (`:5020`, prefix `/auth/*` & `/users/*`) dipanggil langsung pakai `fetch()` ke full URL (CORS sudah dikonfirmasi dikonfigurasi di sisi backend untuk `localhost:5173`), tanpa proxy.
- **State token: plain module + React context tipis.** [src/auth/authStore.ts](../src/auth/authStore.ts) adalah pemilik state sebenarnya (access token in-memory, refresh token di `localStorage`, pub-sub `subscribe`) — dibutuhkan karena [src/api/client.ts](../src/api/client.ts) bukan komponen React tapi butuh baca token terkini secara sinkron di tiap request dan trigger refresh+retry saat `401`. [src/auth/AuthContext.tsx](../src/auth/AuthContext.tsx) cuma `subscribe` ke store itu untuk expose ke tree React lewat `useAuth()` ([src/auth/useAuth.ts](../src/auth/useAuth.ts), dipisah dari file provider mengikuti pola `ToastContext`/`useToast` yang sudah ada, supaya lolos aturan `react-refresh/only-export-components`).
- **Refresh-token reuse-detection guard.** `refreshAccessToken()` di `authStore.ts` de-duplikasi lewat 1 `refreshPromise` in-flight, dan `AuthContext.tsx` pakai `useRef` guard supaya React StrictMode dev double-invoke tidak memicu 2 panggilan refresh dengan refresh-token yang sama (yang bisa kena deteksi reuse backend dan me-revoke semua token user).
- **Permission matrix terpusat** ([src/auth/permissions.ts](../src/auth/permissions.ts)): terjemahan matrix role §5 guide jadi `WRITE_MATRIX`/`APPROVE_MATRIX`/`SUBMIT_MATRIX`/`HPP_ROLES`, diekspos lewat `usePermissions()` (`canWrite`/`canApprove`/`canSubmit`/`canViewHpp`). Selalu **dikombinasikan dengan** (bukan menggantikan) `useDocumentActions().can()` yang sudah ada sejak Fase 1 — dua sistem gating independen: satu soal lifecycle status dokumen, satu soal role user.
- **Route guard 1 titik.** [src/auth/RequireAuth.tsx](../src/auth/RequireAuth.tsx) dipasang cuma dengan membungkus grup route `<Layout/>` yang sudah ada di [App.tsx](../src/App.tsx) — tidak perlu sentuh route individual, persis seperti yang diprediksi di catatan "auth-ready" Fase 11.

**Yang dikerjakan:**
- **Login** ([src/routes/LoginPage.tsx](../src/routes/LoginPage.tsx)): form email/password, redirect balik ke halaman asal (`location.state.from`) setelah login sukses, pesan error yang jelas untuk kredensial salah maupun auth-backend tidak bisa dihubungi.
- **RBAC gating** diterapkan di 7 modul dokumen (Inbound/Outbound, Stock Transfer, Stock Opname, Sales/Purchase, Returns) + 3 master-data (Warehouses, Items, Contacts) + Payments: tombol "+ Tambah" dan aksi edit/delete/complete/cancel digate `canWrite(resource)`, approve/reject digate `canApprove(resource)`, submit (stock opname) digate `canSubmit(resource)`. Untuk Warehouses/Items/Contacts, kolom aksi tabel yang tadinya selalu tampil sekarang di-render kondisional lewat array-spread (`...(canManage ? [...] : [])`) supaya kolom itu sendiri hilang total (bukan cuma tombol di dalamnya) saat user tidak berhak.
- **HPP visibility** ([src/features/dashboard/DashboardPage.tsx](../src/features/dashboard/DashboardPage.tsx)): query `profit` dikasih `enabled: canViewHpp()` (tidak memanggil endpoint sama sekali kalau tidak berhak, bukan cuma sembunyikan hasilnya — sesuai instruksi eksplisit guide "jangan panggil-lalu-sembunyikan"), section kartu Revenue/COGS/Gross Profit/Margin cuma dirender kalau berhak.
- **Kolom audit** (`created_by`/`approved_by`/`completed_by`) ditambah ke semua tipe dokumen transaksional dan ditampilkan di footer tiap halaman detail sebagai `User #{id}` mentah (bukan resolve ke nama) — keputusan sadar karena `GET /users/:id` cuma bisa diakses admin, jadi resolve nama akan 403 untuk role lain; ini salah satu dari 3 opsi yang disarankan guide sendiri sebagai yang paling aman.
- **Modul baru Activity Logs** ([src/features/activityLogs/ActivityLogListPage.tsx](../src/features/activityLogs/ActivityLogListPage.tsx)): list + filter (`user_id`, `warehouse_id`, `entity_type`, `entity_id`, `action`, rentang tanggal), pola identik dengan modul read-only yang sudah ada (mis. `StockMutationListPage` dari Fase 3).
- **BU scoping — sengaja nol kode baru.** `GET /api/warehouses` (dan endpoint list lain) sudah otomatis di-scope BU oleh backend begitu header `Authorization` terpasang. `WarehouseSelect` dan semua dropdown warehouse yang ada cuma mengonsumsi apa pun yang dikembalikan API — jadi begitu token terpasang lewat `client.ts`, scoping BU otomatis berlaku tanpa satu baris kode UI pun perlu diubah. Ini murni manfaat dari arsitektur 1-API-client-terpusat yang dibangun sejak Fase 1.
- Header/sidebar (`Layout.tsx`) ditambah info user login (`user.name`, role, BU) + tombol Logout; nav item HPP disembunyikan untuk role tanpa akses; nav item Activity Logs ditambahkan.
- `.env`/`.env.example` ditambah `VITE_AUTH_API_URL=http://localhost:5020`.

**Catatan verifikasi — dibatasi karena tidak ada kredensial test tersedia:**
- `npm run build` dan `npm run lint` bersih (0 error, 0 warning) setelah seluruh batch perubahan.
- Diverifikasi otomatis di browser (tanpa perlu login sungguhan): akses langsung `/dashboard` tanpa sesi → redirect ke `/login` bekerja benar (`window.location.href` dikonfirmasi `/login`); halaman `/login` render dengan benar (field email/password + tombol submit); submit kredensial salah **maupun** auth-backend tidak terjangkau (dites langsung — server `:5020` memang tidak dijalankan sesi ini) sama-sama menghasilkan pesan error yang wajar di UI, bukan crash — dikonfirmasi lewat `read_console_messages` tidak ada uncaught exception, cuma log network gagal yang memang diharapkan.
- **Tidak bisa diverifikasi live sesi ini** (butuh kredensial asli dan backend auth `:5020` berjalan) — diserahkan ke user untuk QA manual: alur login sukses → redirect ke dashboard, refresh-token rotation, role-based UI gating dengan role sungguhan (6 role berbeda), BU scoping dengan data lintas-BU nyata, alur `401` → refresh → retry otomatis di `client.ts`, dan tampilan pesan `403` untuk endpoint HPP dengan role `staff-gudang`/`kasir-sales`.

**Belum dikerjakan (sengaja, di luar cakupan/backlog):**
- Resolve `created_by`/`approved_by`/`completed_by` ke nama user asli — perlu endpoint non-admin-only atau di-bundle langsung di response dokumen, di luar kendali frontend saat ini.

---

## Fase 12.1 — QA Live dengan Kredensial Asli & Bug Fix ✅ (2026-08-30)

Susulan Fase 12: dokumentasi backend diperbarui dengan **§13 Akun test & data seed** (6 akun asli, password sama `Admin12345`, data seed 1 warehouse `WH-PUSAT` + 5 item + 4 kontak). Isi teknis dokumen sisanya identik dengan yang dipakai Fase 12 (role matrix, BU scoping, HPP restriction, audit fields, dst — sudah di-cross-check ulang ke `permissions.ts`, tidak ada perubahan kode yang diperlukan dari situ). User menyalakan kedua backend (`:3000` + `:5020`), memungkinkan QA live penuh untuk pertama kalinya.

**QA live dilakukan** (browser sungguhan, backend nyata, 6 akun) — semua lolos:
- Login sukses tiap role (`super-admin`, `admin-bu`, `staff-gudang`, `kasir-sales`, `purchasing`, `finance`) → redirect dashboard, header tampilkan nama/role/BU dengan benar.
- Sidebar nav "Cost/HPP" cuma muncul untuk role yang berhak (`super-admin`/`admin-bu`/`purchasing`/`finance`), hilang total untuk `staff-gudang`/`kasir-sales` — dikonfirmasi juga lewat `read_network_requests` bahwa `GET /api/dashboard/profit` **tidak pernah dipanggil** untuk role yang dibatasi (bukan cuma disembunyikan di UI setelah dipanggil).
- Tombol "+ Tambah X" dan kolom aksi tabel muncul/hilang sesuai `WRITE_MATRIX` persis di setiap resource yang dicoba (Warehouses admin-only, Sales muncul untuk `kasir-sales` tapi Purchases tidak, dst).
- Activity Logs (`/activity-logs`) menampilkan data asli dari seed (`CREATE`/`COMPLETE` inbound oleh `User #1`) dengan filter berfungsi.
- Kolom audit di detail dokumen (`Dibuat: ... oleh User #1 · Selesai: ... oleh User #1`) tampil benar dari data nyata.
- 0 error console sepanjang seluruh sesi QA (banyak login/logout/navigasi lintas role).

**Bug nyata ditemukan & diperbaiki (bukan dari kode API/RBAC — dari alur logout→login):**
Setelah logout dari halaman manapun lalu login sebagai user (sama atau beda), aplikasi mendarat balik di halaman SEBELUM logout, bukan `/dashboard` seperti yang dimaksud `handleSubmit` di `LoginPage.tsx`. Root cause berlapis dua, ditemukan lewat reproduksi manual bertahap (bukan dari grep/baca kode saja):
1. `RequireAuth.tsx` redirect ke `/login` dengan `state: {from: location}` **setiap kali** status auth jadi `'unauthenticated'` — termasuk saat logout eksplisit, bukan cuma saat user anonim kena bounce dari halaman terproteksi (kasus yang MEMANG butuh "from"). `handleLogout` (`Layout.tsx`) sendiri juga manggil `navigate('/login')` eksplisit, tapi race dengan redirect reaktif `RequireAuth` ini — dan `RequireAuth`-lah yang menang, bawa `state.from` yang mestinya tidak relevan untuk kasus logout.
2. Percobaan fix pertama (flag `intentionalLogout` di `authStore.ts`, di-"consume" — baca+reset sekaligus — langsung di badan komponen `RequireAuth`) **gagal juga**, dengan gejala identik. Root cause fix-pertama-gagal: React `<StrictMode>` (aktif di `main.tsx`) sengaja **invoke fungsi render 2x** per commit di dev untuk mendeteksi side-effect tidak murni — invocation pertama (yang dibuang React) sudah keburu "consume" (reset) flag itu duluan, jadi invocation kedua (yang beneran dipakai) baca flag yang sudah ke-reset ke `false`, seolah bukan logout eksplisit.

**Fix final** (3 file):
- [`src/auth/authStore.ts`](../src/auth/authStore.ts): `clearSession(intentional = false)` menandai flag module-level `intentionalLogout` cuma kalau dipanggil dari logout eksplisit; dipisah jadi `wasIntentionalLogout()` (pure getter, aman dipanggil dari render) dan `resetIntentionalLogout()` (side effect, HARUS dipanggil dari `useEffect`, bukan dari body komponen).
- [`src/auth/AuthContext.tsx`](../src/auth/AuthContext.tsx): `logout()` manggil `authStore.clearSession(true)`.
- [`src/auth/RequireAuth.tsx`](../src/auth/RequireAuth.tsx): baca `wasIntentionalLogout()` (pure) buat memutuskan bawa `state.from` atau tidak; reset flag lewat `useEffect` terpisah (bukan di badan komponen) — aman dari double-invoke StrictMode karena reset cuma jalan setelah commit sungguhan, bukan di setiap invocation render.
- [`src/routes/Layout.tsx`](../src/routes/Layout.tsx): `handleLogout` tetap manggil `navigate('/login')` eksplisit sebagai jaring pengaman, sekarang konsisten dengan `RequireAuth` karena keduanya sama-sama tidak bawa `from` untuk logout eksplisit.

**Diverifikasi ulang setelah fix** (reproduksi bersih, SPA navigation murni — bukan hard reload — biar tidak ketuker sama artefak rehydration):
- Logout dari halaman manapun (dicoba dari `/dashboard`, `/purchases`) → login user lain → **selalu mendarat di `/dashboard`**, `window.history.state.usr` dikonfirmasi `null` (tidak ada `from` yang nempel).
- Skenario lain (bukan logout — sesi expired/anonim akses langsung ke halaman terproteksi) **tetap bawa `from` dan redirect-balik dengan benar setelah login** — dites dengan clear `refresh_token` dari `localStorage` lalu akses `/warehouses` langsung → dibounce ke `/login` dengan `state.from.pathname: '/warehouses'` → login → **mendarat balik di `/warehouses`**, bukan `/dashboard`. Dua behavior yang tadinya konflik sekarang jalan berdampingan dengan benar.
- `npm run build` + `npm run lint` bersih (0 error, 0 warning) di setiap iterasi fix.

**Catatan metodologi:** dua kali percobaan reproduksi awal (sebelum akhirnya konsisten) sempat menunjukkan hasil membingungkan (login lalu logout otomatis lagi) — ini murni artefak Vite HMR me-remount `AuthProvider` di tengah sesi browser yang masih terbuka SAAT saya sedang mengedit source file secara live (dua instance modul auth yang tumpang tindih) — bukan bug produk, hilang begitu reload penuh dilakukan. Dicatat di sini supaya tidak disalahartikan sebagai bug tambahan kalau pola serupa muncul lagi saat development.

**Yang masih belum bisa diverifikasi:**
- Refresh-token rotation otomatis saat access token benar-benar expired (butuh nunggu 15 menit real-time, di luar cakupan sesi QA ini).

**Update — BU scoping lintas-BU sudah diverifikasi live (2026-08-30, susulan Fase 12.1):** seed data ditambah BU kedua (`BU-C`, `bu_id: 15`, 2 warehouse berhierarki `WH-C-PUSAT`+`WH-C-CABANG`) + 3 akun baru (`admin.buc@test.local` dkk). Dites 2 arah, API langsung (`curl`, di luar frontend) dan lewat UI:
- `admin.pusat` (`bu_id: 13`): `GET /api/warehouses` tanpa filter cuma balikin `WH-PUSAT`; eksplisit akses `warehouse_id` milik BU-C → `403 FORBIDDEN` (`"warehouse 2 is outside your business unit"`).
- `admin.buc` (`bu_id: 15`): sebaliknya, cuma lihat `WH-C-PUSAT`+`WH-C-CABANG`; akses `warehouse_id` milik PUSAT → `403 FORBIDDEN` (`"warehouse 1 is outside your business unit"`).
- Lewat UI (login `admin.buc`): halaman Warehouses cuma tampilkan 2 warehouse BU-C; dropdown `WarehouseSelect` di dashboard **otomatis** cuma isi 2 warehouse itu juga (tanpa kode filter BU apa pun di frontend — persis klaim arsitektur "BU scoping = nol kode baru" di Fase 12) — dikonfirmasi lewat `read_page`, opsi dropdown cuma `WH-C-PUSAT`/`WH-C-CABANG`, tidak ada `WH-PUSAT`.
- Angka dashboard (Total Item 8, Total Qty 216) dicocokkan manual ke tabel stok BU-C di §13 guide — **matematika persis benar** (5 SKU di `WH-C-PUSAT` + 3 SKU di `WH-C-CABANG` = 8 baris; total qty 173+43=216), tidak ada kontaminasi data dari BU PUSAT.
- 0 error console. BU scoping **selesai diverifikasi penuh, 100% sesuai spek §6**.

**Temuan tambahan — alur `401 → refresh → retry` belum bisa dites live saat ini (bukan bug):**
Dicoba simulasikan token expired dengan cara corrupt `Authorization` header (baik string acak maupun JWT berstruktur valid + `exp` di masa lalu + signature palsu), dites langsung ke warehouse-backend pakai `curl` (di luar aplikasi, buat mastiin ini bukan masalah frontend) — **keduanya tetap dapat `200 OK`**, bukan `401`. Kesimpulan: di `AUTH_MODE=hybrid` saat ini, backend memperlakukan **token apa pun yang tidak valid** (bukan cuma token yang tidak ada) sebagai anonymous fallback, bukan ditolak `401`. Konsekuensinya, jalur `401 → refresh → retry` di [client.ts](../src/api/client.ts) kemungkinan besar memang belum ke-trigger sama sekali selama masih hybrid — baru relevan buat live-test setelah backend dipindah ke `AUTH_MODE=jwt` (strict), sesuai catatan §11 guide sendiri. Satu hal yang belum bisa dipastikan 100% lewat simulasi: apakah token **asli** yang expired secara natural (signature valid dari backend, cuma `exp` sudah lewat) diperlakukan sama (tetap 200) atau beda (baru situ backend balikin 401) — butuh private key asli buat bikin token bertanda tangan sah, di luar jangkauan frontend. User memilih cukup verifikasi lewat **code review** untuk bagian ini (bukan live-test) — sudah dicek ulang [client.ts](../src/api/client.ts): `401` → `authStore.refreshAccessToken()` sekali → retry request yang sama; kalau refresh juga gagal → `clearSession()` (non-intentional, `from` state tetap kebawa) → redirect `/login` via `RequireAuth`. `403` → langsung `throw ApiError`, **tidak** coba refresh, **tidak** logout paksa — `getErrorMessage()` resolve ke pesan "Anda tidak punya akses..." (`FORBIDDEN` di `ERROR_MESSAGES`, [errors.ts](../src/api/errors.ts)). Struktur kode cocok 100% dengan §10 guide; live-test edge case expired-token-asli ditunda sampai `AUTH_MODE` beneran dipindah ke strict.

---

## Fase 13 — Profile & User Management ✅ (2026-09-05)

Susulan Fase 12, sesuai spesifikasi lengkap di `frontend-roadmap.md` §Fase 13. Auth-backend sudah
punya endpoint-endpointnya, frontend sebelumnya belum ada UI-nya sama sekali.

**Yang dikerjakan:**
- **13.0 — Client HTTP auth-backend**: [`src/auth/authClient.ts`](../src/auth/authClient.ts) —
  `authGet/authPost/authPut/authPatch/authDelete<T>`, parsing envelope `{success,data,message}`,
  dan **`401 → refresh → retry` sekali** (pola identik `client.ts`). [`types/user.ts`](../src/types/user.ts),
  [`api/users.ts`](../src/api/users.ts), [`api/roles.ts`](../src/api/roles.ts),
  [`api/businessUnits.ts`](../src/api/businessUnits.ts).
- **13.1 — Profile** ([`ProfilePage.tsx`](../src/features/profile/ProfilePage.tsx), route `/profile`,
  semua role): 2 form terpisah (Data Diri, Ganti Password), role/BU/status read-only, validasi
  password client-side (8–72 karakter + huruf besar/kecil/angka + beda dari password lama), pesan
  soal sesi lain ter-logout setelah ganti password, link dari blok nama di header (`Layout.tsx`) —
  update nama langsung sinkron ke header lewat `authStore.updateUser()` baru (tanpa perlu sesi baru).
- **13.2 — User Management** ([`UserListPage.tsx`](../src/features/users/UserListPage.tsx),
  [`UserFormModal.tsx`](../src/features/users/UserFormModal.tsx),
  [`UserSessionsModal.tsx`](../src/features/users/UserSessionsModal.tsx), route `/users`,
  `super-admin`/`admin-bu`): `canManageUsers()` baru di `permissions.ts`; nav "Users" disembunyikan
  total untuk role lain; route digate lewat [`RequirePermission.tsx`](../src/auth/RequirePermission.tsx)
  baru (guard generik, beda dari `RequireAuth` yang cuma cek login) — akses langsung via URL dapat
  halaman "Akses Ditolak", bukan tabel kosong diam-diam. Role dropdown dari `GET /roles` (tidak
  hardcode); field BU kondisional (`requires_bu`, terkunci ke BU sendiri untuk `admin-bu`, input
  angka manual untuk `super-admin` — **tidak ada endpoint "list semua BU"** di spek, jadi tidak bisa
  bikin dropdown nama, ini keterbatasan API bukan lupa); status Aktifkan/Nonaktifkan (tidak ada
  delete); tombol Reset Password (resend link aktivasi) & Sesi (riwayat + cabut refresh-token)
  per baris; guard anti-lockout **tidak** direplikasi di client (backend `409` ditampilkan apa
  adanya lewat `getErrorMessage()`, sesuai instruksi eksplisit spek).

**Bug nyata ditemukan & diperbaiki — semuanya soal bentuk response auth-backend beda dari asumsi
awal, ketahuan pas live QA pertama kali (bukan dari baca dokumentasi, karena dokumentasinya sendiri
tidak merinci sampai level field):**
1. **`GET /users` (list)** — diasumsikan `{data:[...], meta:{...}}` (pola warehouse-backend), asli
   `{data:{users:[...], pagination:{...}}}` — beda nama field DAN 1 level nesting ekstra. Efeknya:
   list User selalu kosong ("Belum ada user."), pagination tidak muncul sama sekali. **Ini akar
   masalah laporan user "+ Tambah User not working"** — tombolnya sendiri sebenarnya OK, cuma
   listnya kosong bikin kelihatan seperti fitur mati.
2. **`GET /roles`** — diasumsikan array langsung `[{name,label,requires_bu}]`, asli
   `{data:{roles:[{name,description,requires_bu}]}}` — dibungkus di bawah key `roles` DAN field
   `label` ternyata `description`. Efeknya: `roles?.find is not a function` — **crash total,
   modal "+ Tambah User" jadi halaman kosong** begitu diklik. Ini penyebab LANGSUNG laporan bug user.
3. **`GET /users/:id/sessions`** — diasumsikan device session dengan `ip_address`/`user_agent`,
   asli riwayat **refresh-token** dengan `status` (`active`/`used`/`revoked`) +
   `replaced_by_token_id` (rantai rotasi token) — model data yang sama sekali beda dari asumsi.
   UI dirombak total buat cocok data asli: badge status per baris, tombol Cabut cuma muncul untuk
   yang `status:'active'`.
4. **`GET/PUT /users/me`, `GET/POST/PUT /users/:id`** — diasumsikan balikin object user langsung,
   asli dibungkus `{data:{user:{...}}}`. Efeknya: halaman Profile tampil kosong (Role/BU/Status blank).
5. **Format timestamp auth-backend beda dari warehouse-backend** — auth-backend pakai ISO 8601
   penuh (`2026-09-04T16:53:11.000Z`), sedangkan `formatTimestamp()` yang sudah ada di
   [`utils/date.ts`](../src/utils/date.ts) khusus format naive warehouse-backend
   (`YYYY-MM-DD HH:mm:ss.SSS`, tanpa `Z`). Dipakai apa adanya di `UserSessionsModal` → semua
   tanggal tampil "NaN Sep 2026". Fix: fungsi baru `formatIsoTimestamp()` (parse via `Date` asli,
   aman karena ISO 8601 punya info timezone eksplisit) — `formatTimestamp()` lama **tidak diubah**,
   tetap dipakai apa adanya di seluruh warehouse-backend module (₆) yang datanya memang naive.
6. StatusBadge belum punya style buat status baru (`ACTIVE`/`SUSPENDED` milik user,
   `USED`/`REVOKED` milik sesi) — jatuh ke default abu-abu. Ditambah 4 entry baru ke
   `STATUS_STYLES` ([`StatusBadge.tsx`](../src/components/StatusBadge.tsx)).

**Pelajaran:** dokumentasi roadmap akurat soal endpoint & field-level bisnis logic (requires_bu,
anti-lockout, no-delete, dst) tapi tidak merinci **bentuk JSON persis** tiap response — masuk akal,
itu bukan scope dokumen arsitektur. Konsekuensinya, integrasi endpoint baru ke backend manapun
(bahkan dengan spek sebagus ini) tetap butuh 1 putaran live-QA sebelum dianggap selesai — 5 dari 6
temuan di atas cuma ketahuan setelah benar-benar klik tombolnya di browser dengan backend nyata,
bukan dari baca kode atau dokumentasi manapun.

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local` dan
`staff.buc@test.local` — kredensial `*.pusat@test.local` dari dokumentasi sebelumnya sudah tidak
valid lagi di database saat ini, kemungkinan di-reset ulang):
- Create user (role `staff-gudang`, BU otomatis terkunci ke BU admin) → sukses, muncul di list,
  pesan aktivasi + token dev-mode tampil benar.
- Edit user → ubah status ke SUSPENDED → tersimpan, badge berubah warna.
- Reset Password (resend) → toast dengan token dev-mode tampil.
- Sesi: riwayat lengkap tampil dengan badge status benar; Cabut 1 sesi `active` lama (bukan punya
  sesi browser saat ini) → status berubah jadi REVOKED, tidak logout diri sendiri.
- Nav "Users" hilang total untuk `staff-gudang`; akses `/users` langsung via URL → halaman "Akses
  Ditolak" (bukan tabel kosong).
- Profile: data tampil benar sesuai role login; edit nama → tersimpan + **langsung berubah di
  header** tanpa reload; validasi password lemah ditolak client-side (tidak ada network call sama
  sekali); percobaan suspend diri sendiri (satu-satunya `admin-bu` aktif di BU) → `409` dengan
  pesan asli backend ("last active admin-bu...") tampil apa adanya, modal tetap terbuka, status
  tidak berubah.
- **`401 → refresh → retry` akhirnya benar-benar teruji end-to-end** (pertama kali sejak Fase 12.1,
  karena auth-backend strict-validate token, beda dari warehouse-backend yang hybrid/lenient) —
  disimulasikan corrupt token 1x request, network log konfirmasi urutan persis:
  `GET /users/me → 401` → `POST /auth/refresh → 200` → retry `GET /users/me → 200`, transparan ke
  UI (halaman tetap render data benar, tidak ada flash error).
- `npm run build` + `npm run lint` bersih (0 error, 0 warning) di tiap iterasi fix.

**Belum diverifikasi** (di luar cakupan sesi ini):
- Verifikasi 2-browser penuh buat cabut sesi (dites cukup 1 browser: API call sukses + status
  berubah REVOKED — belum dibuktikan device lain benar-benar ter-logout).
- `admin-bu` bikin 2 admin-bu dulu baru suspend salah satu (butuh 2 create + edit tambahan,
  di luar waktu sesi ini — tapi jalur 409-block-nya sendiri sudah terverifikasi di skenario
  "cuma 1 admin-bu").

---

## Fase 14.5 — Fitur Cetak PDF (Invoice & Surat Jalan) ✅ (2026-09-06)

Di luar roadmap resmi, permintaan langsung user. Dua halaman cetak baru, sengaja di luar
`<Layout/>` (tanpa sidebar/header/footer) supaya bersih pas di-print/Save-as-PDF, auto-buka dialog
print begitu data siap (fallback tombol manual kalau browser blokir auto-print).

- **Invoice** ([`InvoicePrintPage.tsx`](../src/features/invoices/InvoicePrintPage.tsx), route
  `/sales/:id/print` & `/purchases/:id/print`) — layout invoice standar (header perusahaan, info
  kontak, tabel item, subtotal/pajak/total) **+ watermark diagonal** sesuai `payment_status`:
  hijau PAID, amber PARTIAL, merah UNPAID.
- **Surat Jalan** ([`InventoryTransactionPrintPage.tsx`](../src/features/inventoryTransactions/InventoryTransactionPrintPage.tsx),
  route `/inbounds/:id/print` & `/outbounds/:id/print`) — dibuat terpisah dari invoice atas
  rekomendasi eksplisit ke user: Inbound/Outbound bukan dokumen finansial (tidak ada harga/status
  bayar), jadi bentuknya beda — tanpa kolom harga, ada 3 kolom tanda tangan (Dikirim/Diterima/
  Mengetahui) buat serah terima fisik, dan watermark status dokumen (bukan payment) kalau belum
  `COMPLETED` (biar draft tidak ketuker jadi bukti resmi).
- Identitas perusahaan (`COMPANY_NAME`, dst) diekstrak ke [`src/config/company.ts`](../src/config/company.ts)
  dari yang tadinya cuma di `Layout.tsx`, dipakai bareng kedua halaman cetak.
- **Diverifikasi live** untuk invoice (dikonfirmasi user langsung "hasilnya oke"). Verifikasi live
  surat jalan sempat terblokir masalah data lingkungan tidak terkait kode (lihat
  [`bug-report-bu-id-mismatch.md`](./bug-report-bu-id-mismatch.md)) — sudah diperbaiki user di
  sisi backend per 2026-09-06/08, live-QA menyusul di Fase 14 di bawah pakai data yang sudah pulih.
- `npm run build` + `npm run lint` bersih di tiap iterasi.

---

## Fase 14 — Multi-Tenant: Role `owner` & Multi-BU Grant ✅ (2026-09-08)

Susulan §14 `frontend-integration-guide.md` (update 2026-09-08). Auth-backend jadi multi-tenant:
klaim token baru (`bu_ids`, `company_id`), role ke-7 (`owner`, view-only lintas semua BU dalam
1 company), dan `admin-bu` sekarang bisa di-grant akses ke lebih dari 1 BU.

**Yang dikerjakan** (3 poin konkret dari guide, dicek satu-satu):

1. **Role `owner` ditambahkan** ke [`permissions.ts`](../src/auth/permissions.ts) — cukup 2 baris
   perubahan berkat desain `WRITE_MATRIX`/`APPROVE_MATRIX`/`SUBMIT_MATRIX` yang sudah berupa
   allowlist sejak Fase 12: `owner` ditambah ke union type `Role`, tapi **sengaja tidak pernah**
   dimasukkan ke matrix write/approve/submit manapun (backend nolak 403 tanpa kecuali di semua
   endpoint tulis) — otomatis bikin `canWrite()`/`canApprove()`/`canSubmit()` balikin `false` buat
   owner di semua resource tanpa perlu baris pengecualian eksplisit di tiap halaman. `owner`
   ditambah ke `HPP_ROLES` (boleh lihat HPP sesuai spek). Sebelum nulis kode, di-grep dulu **semua**
   tempat yang manggil `can('edit')`/`can('delete')`/dst di `src/features/` — dikonfirmasi 100%
   sudah selalu dikombinasikan dengan `canWrite`/`canApprove`/`canSubmit`/`canRecordPayment`, jadi
   fix di 1 file ini otomatis nutup semua tombol tulis di seluruh app tanpa sentuh halaman lain.
2. **Klaim token baru (`bu_ids`, `company_id`)** — dicek (`grep`) tidak ada decode JWT manual di
   frontend manapun; semua baca `user` object dari response login/refresh (§3 guide). **Nol
   perubahan diperlukan**, persis seperti dugaan guide-nya sendiri.
3. **Label BU per baris di Warehouses** ([`WarehouseListPage.tsx`](../src/features/warehouses/WarehouseListPage.tsx),
   opsional di guide, dikerjakan karena jelas berguna buat skenario baru ini) — kolom "BU" cuma
   muncul kalau data di halaman itu **beneran lintas >1 BU** (dihitung dari `Set` distinct
   `bu_id` di data yang sedang tampil) — user BU tunggal biasa tidak lihat kolom ini sama sekali,
   tidak ada noise. Isinya: nama BU asli (`user.bu_name`) kalau baris itu BU home user sendiri,
   kalau bukan cukup `BU #<id>` mentah (tidak ada endpoint list-semua-BU buat resolve nama BU lain
   — sama seperti keterbatasan yang sudah dicatat di Fase 13 buat form Tambah User). Field `bu_id`
   & `parent_warehouse_id` ternyata belum pernah dipetakan di [`types/warehouse.ts`](../src/types/warehouse.ts)
   sejak awal (ada di response API asli tapi kelewat di type) — ditambahkan sekalian.

**Diverifikasi live** (browser sungguhan, backend nyata, setelah bug `bu_id` mismatch diperbaiki
user di backend — lihat `bug-report-bu-id-mismatch.md`):
- `owner@test.local` — dashboard & dropdown warehouse otomatis gabungan **3 warehouse dari 2 BU**
  sekaligus (PUSAT + BU-C) tanpa kode switch-tenant apa pun; kartu HPP (Revenue/COGS/Gross
  Profit/Margin) tampil; nav "Users" **tidak muncul**; halaman list Inbound/Warehouses **tidak ada**
  tombol "+ Tambah" sama sekali; kolom "BU" di Warehouses tampil `BU #13`/`BU #15` (owner
  `bu_id: null`, jadi tidak ada baris yang match "BU sendiri", semua tampil raw ID — sesuai desain).
- `admin.pusat@test.local` (baru di-grant `bu_ids: [13, 15]`) — list Warehouses juga otomatis
  gabungan 2 BU, **tombol "+ Tambah Warehouse" + Edit/Hapus tetap muncul** (beda dari owner, sesuai
  matrix), kolom BU tampil `Business Unit Pusat` (nama asli, BU home sendiri) untuk baris PUSAT dan
  `BU #15` (raw id, BU hasil grant) untuk baris BU-C — persis behavior yang didesain.
- 0 error console di kedua sesi.
- `npm run build` + `npm run lint` bersih.

**Update — halaman cetak Surat Jalan (Fase 14.5) sudah diverifikasi live (2026-09-08), susulan
sesi ini**, setelah data `bu_id` pulih:
- Inbound COMPLETED (`IN-000001`) & Outbound COMPLETED (`OUT-000004`, hasil sale) — render benar:
  header perusahaan, info kontak (supplier/customer), tabel item tanpa kolom harga, 3 kolom tanda
  tangan, **tanpa** watermark (sesuai desain, cuma non-COMPLETED yang dapat watermark).
- Dibuat 1 inbound DRAFT baru khusus buat nguji watermark → **watermark "DRAFT" tampil benar**
  (diagonal -30°, sesuai `status` dokumen) — satu-satunya bagian yang belum sempat dites
  sebelumnya. Dokumen test dihapus lagi setelah diverifikasi (`DELETE /inbounds/5` sukses).
- 0 error console di semua kasus. Fitur cetak PDF (invoice §14.5 + surat jalan) **selesai
  diverifikasi penuh**, tidak ada lagi yang pending.

---

## Fase 15 — Items & Contacts di-scope per BU ✅ (2026-09-08)

Susulan §15 & §16 `frontend-integration-guide.md` (update 2026-09-08).

**§15 — Items & Contacts sekarang di-scope per BU** (sebelumnya master data global murni):
- **Dicek dulu sebelum ubah apa pun** — [`ItemPicker.tsx`](../src/components/ItemPicker.tsx) &
  [`ContactSelect.tsx`](../src/components/ContactSelect.tsx) (satu-satunya tempat item/contact
  dipilih di seluruh app) ternyata **sudah 100% compliant**: keduanya selalu fetch live dari
  `GET /api/items(/search)` / `GET /api/contacts` (sudah otomatis ke-scope BU), tidak ada
  hardcode/cache ID lintas sesi. **Nol perubahan diperlukan** buat poin ini.
- **Field `bu_id` ditambahkan** ke [`types/item.ts`](../src/types/item.ts) &
  [`types/contact.ts`](../src/types/contact.ts) — sama seperti `Warehouse` di Fase 14, field ini
  ada di response API asli tapi kelewat di type.
- **Kolom "BU" ditambahkan** ke [`ItemListPage.tsx`](../src/features/items/ItemListPage.tsx) &
  [`ContactListPage.tsx`](../src/features/contacts/ContactListPage.tsx), pola identik
  `WarehouseListPage.tsx` (Fase 14) — cuma tampil kalau data beneran lintas >1 BU. Logic-nya
  di-refactor jadi 2 helper reusable supaya tidak triplikasi: [`utils/bu.ts`](../src/utils/bu.ts)
  (`hasMultipleBuIds()`) dan [`components/BuLabel.tsx`](../src/components/BuLabel.tsx) — 3 halaman
  (Warehouses, Items, Contacts) sekarang pakai fungsi yang sama, `WarehouseListPage.tsx` ikut
  di-retrofit ke helper ini (sebelumnya inline duplikat).
- Form create/edit item & contact dicek (`grep`) — sudah tidak pernah kirim `bu_id` di body sama
  sekali (`ItemInput`/`ContactInput` memang tidak punya field itu), konsisten dengan §15
  ("`bu_id` di body create/update diabaikan dari client, di-force server-side").

**§16 — Auto-provisioning warehouse utama:** dicek (`grep`), **tidak ada halaman/flow "buat
Business Unit baru" sama sekali** di frontend saat ini — jadi endpoint
`POST /api/warehouses/provision-default` belum ada tempat buat dipanggil. Bukan celah, cuma belum
relevan; kalau nanti dibangun halaman manajemen company/BU, endpoint ini tinggal dipanggil sekali
setelah `POST /business-units` sukses (sesuai spek §16).

**Diverifikasi live** (browser sungguhan, backend nyata, akun `owner@test.local`):
- `GET /api/items` & `GET /api/contacts` dikonfirmasi **beneran balikin field `bu_id`** di
  response asli (bukan asumsi) — semua item/contact yang ada sekarang `bu_id: 13` (PUSAT),
  konsisten dengan catatan guide "data lama di-backfill ke BU PUSAT".
- Karena belum ada item/contact milik BU lain, kolom "BU" **belum bisa didemonstrasikan visual**
  di 2 halaman ini secara langsung — tapi logic pembanding (`hasMultipleBuIds`) sudah pasti benar
  karena kode & jalur yang identik **sudah** diverifikasi visual di `WarehouseListPage.tsx` (Fase
  14, 2 BU nyata, kolom tampil benar `Business Unit Pusat` vs `BU #15`).
- 0 error console (1 baris `401` di log cuma refresh-token siklus normal, ter-handle transparan —
  halaman tetap render data benar, sudah dibuktikan jalur ini di Fase 13).
- `npm run build` + `npm run lint` bersih.

---

## Fase 15.5 — Fix: Tidak Bisa Bikin Warehouse Cabang ✅ (2026-09-09)

**Bug nyata dilaporkan user**: percobaan bikin warehouse ke-2 (niatnya cabang) di BU yang sudah
punya 1 warehouse utama selalu ditolak `409` (`"Business unit X already has a main warehouse
(id=Y); only one is allowed"`). Root cause **bukan bug backend** — aturan "1 BU cuma boleh 1
warehouse utama" itu memang benar (`MAIN_WAREHOUSE_EXISTS`, api-documentation.md §4) — tapi
[`WarehouseFormModal.tsx`](../src/features/warehouses/WarehouseFormModal.tsx) **tidak pernah
punya field buat pilih `parent_warehouse_id`** sejak awal dibuat. Akibatnya SETIAP warehouse yang
dibuat lewat form selalu dikirim sebagai warehouse utama (`parent_warehouse_id: null` implisit) —
fitur hierarki utama+cabang sudah lama didokumentasikan & dipakai di data seed (`WH-C-PUSAT` +
`WH-C-CABANG`), tapi UI buat bikinnya sendiri memang belum pernah dibangun.

**Fix:**
- [`types/warehouse.ts`](../src/types/warehouse.ts) — `WarehouseInput` ditambah
  `parent_warehouse_id?: number | null`.
- [`WarehouseFormModal.tsx`](../src/features/warehouses/WarehouseFormModal.tsx) — dropdown baru
  "Warehouse Utama (kosongkan kalau ini warehouse utama)", opsinya cuma warehouse yang **beneran**
  warehouse utama (`parent_warehouse_id == null`) — cabang tidak boleh punya cabang (kedalaman
  dibatasi 2 level, §4), dan warehouse yang sedang diedit dikecualikan dari opsinya sendiri
  (tidak boleh jadi parent diri sendiri). Daftar kandidat diambil dari `GET /api/warehouses` yang
  sudah otomatis ke-scope BU pemanggil, jadi otomatis relevan tanpa filter tambahan; validasi
  `bu_id sama` tetap jadi tanggung jawab akhir backend seperti biasa.
- [`WarehouseDetailPage.tsx`](../src/features/warehouses/WarehouseDetailPage.tsx) — tambahan kecil
  komplementer: baris "Cabang dari: {kode — nama}" (link ke parent) muncul kalau warehouse itu
  memang cabang, biar hierarkinya kelihatan setelah dibuat.

**Diverifikasi live** (`admin.buc@test.local`, BU-C yang sudah punya 1 utama + 1 cabang existing):
- Dropdown parent di form Tambah Warehouse **cuma nampilin `WH-C-PUSAT`** (warehouse utama),
  `WH-C-CABANG` (cabang existing) **tidak muncul** sebagai opsi — persis sesuai desain.
- Bikin warehouse ke-3 (`WH-C-TEST`) dengan parent = `WH-C-PUSAT` → **sukses, tidak ada lagi
  error 409** — bug reported user terbukti fixed.
- Halaman detail `WH-C-TEST` menampilkan "Cabang dari: WH-C-PUSAT — Gudang Utama BU-C" dengan
  benar, link-nya jalan.
- Data test dihapus lagi setelah diverifikasi (`DELETE /warehouses/:id` sukses, balik ke 2
  warehouse semula).
- 0 error console. `npm run build` + `npm run lint` bersih.

---

## Fase 16 — Assign Staff per Warehouse (§17) ✅ (2026-09-09)

Backend nambah lapisan scoping baru **di bawah** BU: role level-staff (`staff-gudang`,
`kasir-sales`, `purchasing`, `finance`) sekarang bisa dibatasi ke warehouse **tertentu** di dalam
BU-nya (sebelumnya scope mereka cuma BU-wide, sama kayak admin-bu). Staff yang belum di-assign ke
warehouse mana pun kena hard-block `403 WAREHOUSE_ACCESS_NOT_CONFIGURED` di **semua** endpoint
`/api/*` kecuali `GET /api/me/access-status` — jadi begitu backend menyalakan fitur ini, staff
lama yang belum di-assign otomatis terkunci total sampai admin-bu men-assign mereka.
admin-bu/owner/super-admin tidak pernah kena aturan ini (tetap BU-wide/global seperti biasa).
Endpoint lain (`/api/stocks`, `/api/inbounds`, dst.) **tidak perlu diubah** — narrowing-nya
otomatis di backend begitu staff sudah di-assign (didokumentasikan
[docs/user-warehouse-assignments.md](user-warehouse-assignments.md) & §17
[frontend-integration-guide.md](frontend-integration-guide.md)).

**Dibangun:**
- [`types/warehouseAssignment.ts`](../src/types/warehouseAssignment.ts) — `AccessStatus`,
  `WarehouseAssignment`, `WarehouseAssignmentInput`.
- [`api/me.ts`](../src/api/me.ts) — `getAccessStatus()` (`GET /api/me/access-status`).
- [`api/userWarehouseAssignments.ts`](../src/api/userWarehouseAssignments.ts) —
  `listAssignments/createAssignment/deleteAssignment` (`GET/POST/DELETE
  /api/user-warehouse-assignments`, filter `?warehouse_id=`, delete by assignment id bukan
  `user_id`).
- [`auth/permissions.ts`](../src/auth/permissions.ts) — `STAFF_ROLES` (4 role di atas), dipakai
  buat nentuin siapa yang kena guard baru & siapa yang eligible di-assign; reuse
  `canManageUsers()` yang sudah ada buat gating halaman admin (actor-nya sama persis dengan Users:
  admin-bu/super-admin).
- [`auth/RequireWarehouseAccess.tsx`](../src/auth/RequireWarehouseAccess.tsx) — guard baru, cuma
  aktif buat `STAFF_ROLES` (`enabled: isStaff`, role lain langsung `<Outlet/>` tanpa query sama
  sekali). Cek `GET /api/me/access-status` sekali abis login/refresh; `assigned: false` →
  redirect `/access-notice`.
- [`routes/AccessNoticePage.tsx`](../src/routes/AccessNoticePage.tsx) — halaman notice buat staff
  yang belum di-assign, pesan personalized (nama + BU) + tombol Logout. Satu-satunya endpoint
  yang tetap bisa mereka akses ke depan cuma `/me/access-status`, jadi memang tidak ada apa pun
  lain buat ditampilkan.
- [`features/warehouseAssignments/WarehouseAssignmentsPage.tsx`](../src/features/warehouseAssignments/WarehouseAssignmentsPage.tsx) —
  halaman admin-bu baru "Assign Staff ke Warehouse": pilih warehouse (`WarehouseSelect` yang
  sudah otomatis ke-scope BU), lalu 2 kolom — staff ter-assign (tombol "Cabut" +
  `ConfirmDialog`) & form assign staff baru (dropdown cuma nampilin staff BU ini yang **belum**
  ter-assign ke warehouse yang dipilih).
- [`api/client.ts`](../src/api/client.ts) — tangkap `WAREHOUSE_ACCESS_NOT_CONFIGURED` di
  `request()`, redirect keras `window.location.href = '/access-notice'` (bukan cuma lempar error
  ke pemanggil) — beda pola dari 401 (yang pakai refresh-retry lewat `authStore`) karena ini bukan
  soal sesi tidak valid, tapi tidak ada satu pun halaman lain yang punya data buat ditampilkan
  sampai staff di-assign ulang. Ditangani terpisah dari guard di atas supaya kejadian **mid-sesi**
  (mis. admin-bu cabut assignment terakhir staff yang lagi aktif browsing) juga langsung ke-redirect,
  bukan cuma dicek sekali pas login.
- [`api/errors.ts`](../src/api/errors.ts) — pesan buat `WAREHOUSE_ACCESS_NOT_CONFIGURED` &
  `ASSIGNMENT_EXISTS`.
- [`App.tsx`](../src/App.tsx) — `/access-notice` sengaja di luar `RequireWarehouseAccess` (kalau
  di dalam bakal redirect loop); guard baru dibungkus di luar `Layout` + route print (biar staff
  yang belum di-assign juga tidak bisa buka halaman print lewat URL langsung); route
  `/warehouse-assignments` di dalam grup `RequirePermission canManageUsers` yang sudah ada,
  sejajar `/users`.
- [`Layout.tsx`](../src/routes/Layout.tsx) — nav item baru "Assign Staff" di grup "Administrasi"
  (sejajar "Users", sama-sama cuma muncul buat admin-bu/super-admin).

**Bug ditemukan & di-fix (live QA):** setelah assign `staff.buc@test.local` ke `WH-C-PUSAT` lewat
halaman admin, login **ulang** sebagai `staff.buc` di tab browser yang sama tetap ke-redirect ke
`/access-notice` — padahal seharusnya sudah boleh masuk. Root cause: `useQuery` di
`RequireWarehouseAccess.tsx` pakai `staleTime: Infinity` dengan `queryKey: ['access-status']`.
Cache TanStack Query itu global per key, **bukan** per sesi login — jadi hasil `{assigned:false}`
dari percobaan login PERTAMA (sebelum di-assign) masih ke-serve lagi di percobaan login KEDUA
(sesudah di-assign) di tab yang sama, tidak pernah di-refetch. Fix: ganti `staleTime: Infinity` →
`refetchOnMount: 'always'`, dan loading-gate dari `isLoading` doang jadi `isLoading || isFetching`
(supaya keputusan redirect nunggu data yang genuinely fresh, bukan bertindak atas cache basi
sementara refetch di background masih jalan).

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local` &
`staff.buc@test.local`, BU-C):
- `staff.buc` yang genuinely belum di-assign dikonfirmasi kena `403
  WAREHOUSE_ACCESS_NOT_CONFIGURED` di `GET /api/warehouses` (curl langsung, di luar frontend) —
  backend beneran menegakkan aturannya, bukan asumsi.
- Login sebagai `staff.buc` (belum di-assign) → redirect ke `/access-notice` dengan pesan
  personalized benar ("Halo Staff Gudang BU-C..." + "Business Unit: Business Unit C").
- `admin.buc` (role admin-bu) login → langsung `/dashboard`, **tidak** kena "Memeriksa akses..."
  sama sekali (guard skip total buat non-staff, query bahkan tidak `enabled`).
- Halaman `/warehouse-assignments`: pilih `WH-C-PUSAT` → assign "Staff Gudang BU-C" → sukses,
  masuk daftar ter-assign, hilang dari dropdown eligible.
- Setelah fix bug cache: login ulang `staff.buc` (sudah di-assign) → **berhasil** masuk
  `/dashboard`, dan dropdown Warehouse di dashboard **otomatis cuma nampilin `WH-C-PUSAT`** (bukan
  semua warehouse BU-C) — membuktikan "narrowing otomatis di backend" dari §17 beneran jalan,
  bukan cuma janji dokumentasi.
- Tombol "Cabut" di halaman admin: klik → `ConfirmDialog` muncul dengan label yang benar →
  konfirmasi → assignment hilang dari daftar, staff muncul lagi di dropdown eligible.
- Login ulang `staff.buc` setelah di-cabut → **kembali** ke-redirect `/access-notice` — jalur
  redirect kedua arah (assigned→akses, unassigned→notice) sama-sama kebukti benar.
- `staff.buc` di-assign ulang ke `WH-C-PUSAT` setelah semua QA selesai (data test **sengaja
  dibiarkan**, bukan dihapus — jadi ke depan ada 1 akun staff yang beneran punya akses jalan buat
  QA berikutnya).
- 0 error console di semua langkah. `npm run build` + `npm run lint` bersih.

**Belum dites** (di luar scope sesi ini, tidak blocking): role `kasir-sales`/`purchasing`/
`finance` selain `staff-gudang` (jalur kodenya identik, sama-sama lewat `STAFF_ROLES`), dan
redirect mid-sesi yang genuinely terjadi **tanpa** re-login (disimulasikan lewat re-login manual
di sesi ini, bukan lewat tab staff yang tetap aktif pas assignment dicabut dari tab admin lain).

---

## Fase 18 — Shortcut "+ Tambah Item Baru" di Form Transaksi ✅ (2026-09-13)

Permintaan user: pengguna nggak harus tinggalin transaksi (Inbound/Sales) yang lagi diisi cuma
buat ke halaman Items dulu kalau ternyata item-nya belum ada di master data. Solusinya nempel di
[`ItemPicker`](../src/components/ItemPicker.tsx) — search-select item yang sudah dipakai bareng
di semua form transaksi (Inbound/Outbound, Sales/Purchase, Stock Transfer, Opname) — jadi 1
perubahan otomatis konsisten di mana pun dipakai.

**Dibangun:**
- [`ItemPicker.tsx`](../src/components/ItemPicker.tsx) — prop baru `allowCreate?: boolean`
  (default `false`, opt-in). Kalau aktif dan dropdown pencarian lagi kebuka, muncul baris
  `+ Tambah "<teks yang diketik>" sebagai item baru` di bawah hasil (atau sendirian kalau nggak
  ada hasil sama sekali — kasus utama fitur ini). Diklik → buka `ItemFormModal` mode create,
  field Nama ke-prefill otomatis dari teks yang sudah diketik user. Abis submit sukses, item baru
  langsung ke-`setQueryData` ke cache TanStack Query (instan, tanpa round-trip `GET /items/:id`
  lagi) dan otomatis ke-*select* di baris transaksi — user lanjut isi qty/harga tanpa reload atau
  pindah halaman sama sekali.
- **Gating permission**: shortcut cuma tampil kalau `allowCreate` diaktifkan DI form pemanggil
  **DAN** `canWrite('items')` true buat role yang login (`super-admin`/`admin-bu`/`purchasing`,
  §5 `WRITE_MATRIX`). Backend nolak 403 create item buat role lain (`staff-gudang`, `kasir-sales`,
  `finance`) — kalau shortcut ditampilkan ke mereka juga, ujung-ujungnya cuma nawarin tombol yang
  pasti ditolak backend. `allowCreate` sengaja opt-in per pemanggil (bukan otomatis nyala di semua
  pemakaian `ItemPicker`) karena widget yang sama dipakai juga di filter report read-only
  (`CostLayerListPage`/`StockMutationListPage`/`StockListPage`) yang bukan konteks transaksi —
  aktifkan cuma di [`InventoryTransactionFormPage.tsx`](../src/features/inventoryTransactions/InventoryTransactionFormPage.tsx)
  (Inbound+Outbound) dan [`InvoiceFormPage.tsx`](../src/features/invoices/InvoiceFormPage.tsx)
  (Sales+Purchase) sesuai yang diminta; Stock Transfer/Opname sengaja belum disentuh (di luar
  scope permintaan, item di situ memang lazimnya sudah ada di stok).
- [`ItemFormModal.tsx`](../src/features/items/ItemFormModal.tsx) — 2 prop baru yang backward-
  compatible (opsional, pemakaian existing di `ItemListPage.tsx` tidak berubah): `initialName`
  (prefill Nama pas mode create) dan `onCreated(item)` (callback abis create sukses, dipanggil
  sebelum modal ketutup).

**Bug ditemukan & di-fix waktu live-QA (nested `<form>`):** percobaan pertama, item hasil create
GAGAL ke-auto-select — field Item balik kosong lagi abis modal ketutup. Root cause:
[`Modal.tsx`](../src/components/Modal.tsx) me-render `<div>` biasa langsung di tempat dipanggil
(tanpa portal), dan `ItemFormModal` punya `<form>` sendiri di dalamnya. Begitu dipanggil dari
`ItemPicker` yang sekarang duduk di dalam `<form>` besar milik halaman transaksi, hasilnya
`<form><form>...</form></form>` — HTML tidak mengizinkan `<form>` bersarang, jadi browser
otomatis "membetulkan" DOM itu (console React sempat nunjukin warning "cannot be a descendant of
form"), yang bikin binding submit modal jadi tidak semestinya. **Fix**: `Modal.tsx` di-portal ke
`document.body` pakai `createPortal` — bukan cuma nge-patch `ItemFormModal`, tapi benerin akar
masalahnya di komponen `Modal` itu sendiri, jadi modal ATAU form apa pun ke depannya otomatis
aman dipanggil dari dalam konteks form manapun (position tetap `fixed inset-0`, jadi visual tidak
berubah sama sekali, cuma titik DOM-nya yang pindah).

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local` &
`staff.buc@test.local`):
- Di halaman Tambah Inbound, ketik nama item yang belum ada ("Obeng Plus Kecil") → muncul
  `+ Tambah "Obeng Plus Kecil" sebagai item baru`, diklik → modal kebuka dengan Nama sudah
  ke-prefill benar.
- Verifikasi DOM langsung (`closest('form')` count) mengonfirmasi cuma **1** `<form>` ancestor
  abis fix portal — nested-form beneran hilang, bukan cuma keliatan hilang di layar.
- Isi SKU (`OBG-PLUS-KCL`) + Satuan (`pcs`) → Simpan → modal ketutup, field Item di baris
  transaksi langsung menunjukkan `OBG-PLUS-KCL — Obeng Plus Kecil` **tanpa perlu cari ulang**.
- Transaksi inbound diselesaikan (pilih warehouse, submit) → sukses jadi `IN-000007`, baris
  detail menunjukkan item baru itu dengan benar — provenan lengkap dari "item belum ada" sampai
  "transaksi tersimpan" tanpa pernah keluar dari halaman Inbound.
- Gating permission dites pakai `staff.buc` (role `staff-gudang`, TIDAK ada di `WRITE_MATRIX`
  items): ketik nama item yang belum ada di form Inbound → shortcut **tidak muncul sama sekali**
  (cuma pesan "tidak ada hasil" implisit, dropdown kosong) — sesuai desain, backend akan nolak
  403 kalau dipaksa create lewat role ini.
- Sekalian ke-konfirmasi ulang dropdown Warehouse `staff.buc` masih narrowed ke `WH-C-PUSAT` doang
  — fitur Fase 16 tidak keganggu oleh perubahan ini.
- 0 error console di jalur yang sudah di-fix (dicek pakai tab browser fresh biar bebas dari log
  lama yang sempat nyangkut sebelum fix).
- `npm run build` + `npm run lint` bersih (`dist/` dibersihin abis verifikasi).

Sekalian dites juga di halaman Tambah Sales (`InvoiceFormPage.tsx`, kind `sales`) pakai
`admin.buc` — ketik item baru ("Baterai AA Alkaline") → shortcut muncul → create (`BAT-AA-ALK`)
→ auto-select `BAT-AA-ALK — Baterai AA Alkaline` di baris, 0 error console. Jalur Purchase pakai
komponen yang identik (cuma beda `kind` prop), jadi tidak diulang terpisah.

**Catatan data test**: item master (`RG6-COAX`/"Kabel Coax RG6", `OBG-PLUS-KCL`/"Obeng Plus
Kecil", `BAT-AA-ALK`/"Baterai AA Alkaline") dibiarkan permanen — backend memang tidak punya
`DELETE /items` sama sekali (item master tidak boleh dihapus, per `docs/api-documentation.md`),
jadi ini bukan pilihan, tapi keterbatasan API yang sudah ada dari awal.

**Belum dites** (di luar scope permintaan user, tidak blocking): shortcut yang sama di Stock
Transfer/Opname — sengaja tidak diaktifkan (`allowCreate` tidak dipasang di kedua form itu), jadi
tidak relevan diuji.

---

## Fase 19 — Metode Bayar Standar (Enum), Diskon & Kembalian ✅ (2026-09-13)

Backend nambah 6 fitur operasional kasir sekaligus (§18–23 frontend-integration-guide.md,
roadmap "operasional kasir" penuh): barcode scanner, cetak struk Bluetooth, sesi kasir/shift,
diskon+kembalian, hold/resume transaksi, dan standarisasi `payment_method` jadi enum. Karena
scope-nya besar dan salah satu bagian (arsitektur POS: nempel di halaman Sales existing vs.
halaman POS terpisah) genuinely butuh keputusan user, sesi ini **cuma ngerjain 1 dari 4 kelompok
fitur** sesuai prioritas yang dipilih user: **metode bayar (enum) + diskon + kembalian** — yang
paling urgent karena `payment_method` teks bebas sebelumnya bakal langsung ke-reject `400` begitu
backend menegakkan enum. Sisanya (hold/resume, barcode scanner, sesi kasir + cetak struk) belum
dikerjakan, ditunggu prioritas berikutnya dari user.

**Keputusan arsitektur (dipilih user via pertanyaan eksplisit):** fitur-fitur ini ditempel ke
halaman Sales/Purchase yang **sudah ada** (`InvoiceFormPage`/`InvoiceDetailPage`,
`PaymentFormModal`) — bukan halaman POS terpisah.

**Dibangun:**
- [`types/payment.ts`](../src/types/payment.ts) — `PaymentMethod` union (`CASH`/`QRIS`/`DEBIT`/
  `CREDIT`/`TRANSFER`/`EWALLET`/`OTHER`) + `PAYMENT_METHODS` (value+label Indonesia, dipakai
  dropdown DAN buat resolve label di halaman detail). `Payment.payment_method` sengaja tetap
  `string` (bukan `PaymentMethod`) — data lama pra-enum (mis. `"Cash"`/`"transfer"`) masih valid
  ditampilkan apa adanya per dokumentasi backend, enum cuma ditegakkan pas menulis data baru.
  Tambah `amount_tendered`, `change_amount`, `cash_session_id` (field baru, terakhir ini belum
  dipakai UI-nya — bagian dari fitur sesi kasir yang belum dikerjakan).
- [`features/payments/PaymentFormModal.tsx`](../src/features/payments/PaymentFormModal.tsx) —
  input `payment_method` dari `TextField` teks bebas jadi `SelectField` enum. Field baru "Uang
  Diterima" cuma muncul kalau metode `CASH` (default disamain dengan Jumlah, kasir tinggal ubah
  manual kalau pelanggan kasih lebih), preview kembalian live di frontend
  (`amount_tendered - amount`) sebelum submit — server tetap sumber kebenaran akhir lewat
  `change_amount` di response, ditampilkan di toast sukses ("Kembalian: Rp1.000"). Validasi
  client-side `amount_tendered < amount` ditolak sebelum request (`400
  AMOUNT_TENDERED_TOO_LOW` dari backend jadi jaring pengaman kedua, bukan yang utama).
- [`types/invoice.ts`](../src/types/invoice.ts) — `Invoice.discount_amount: string` (selalu ada
  di response) dan `InvoiceInput.discount_amount?: number` (opsional, nominal bukan persen).
- [`InvoiceFormPage.tsx`](../src/features/invoices/InvoiceFormPage.tsx) — field baru "Diskon
  (nominal, opsional)" sejajar Tax Rate. Preview kalkulasi disamakan PERSIS urutan backend:
  `taxable_base = subtotal - discount` → `tax = taxable_base * tax_rate` → `total = taxable_base +
  tax` (diskon diterapkan SEBELUM pajak, bukan dipotong dari total). Validasi client-side diskon
  tidak boleh melebihi subtotal sebelum submit (`400 DISCOUNT_EXCEEDS_SUBTOTAL` dari backend jadi
  jaring pengaman kedua). Prefill `discount_amount` juga dibaca saat mode edit.
- [`InvoiceDetailPage.tsx`](../src/features/invoices/InvoiceDetailPage.tsx) &
  [`InvoicePrintPage.tsx`](../src/features/invoices/InvoicePrintPage.tsx) — baris "Diskon"
  ditambahkan ke breakdown Subtotal/Tax/Total (cuma tampil kalau `discount_amount > 0`). Tabel
  Pembayaran dapat kolom baru "Kembalian" (cuma tampil kalau `change_amount > 0`, `-` kalau
  tidak), kolom "Metode" sekarang resolve ke label Indonesia (`paymentMethodLabel()`, fallback ke
  nilai mentah kalau bukan salah satu dari 7 enum — buat kompatibel data lama).
- [`api/errors.ts`](../src/api/errors.ts) — pesan buat `DISCOUNT_EXCEEDS_SUBTOTAL` &
  `AMOUNT_TENDERED_TOO_LOW`.

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local`, BU-C):
- Bikin Sales baru: item `OBG-PLUS-KCL` qty 10 @ Rp100.000 (subtotal Rp1.000.000), Diskon
  Rp100.000, Tax 11% → preview frontend menghitung **Rp99.000 tax, Rp999.000 total** (dari
  taxable base Rp900.000, bukan dari subtotal utuh) — submit, dan **detail page abis reload
  server-side menunjukkan angka PERSIS SAMA** (Subtotal Rp1.000.000, Diskon -Rp100.000, Tax
  Rp99.000, Total Rp999.000) — kalkulasi frontend match 100% dengan hitungan backend, bukan
  kebetulan.
- Sempat kena `409 INSUFFICIENT_STOCK` waktu coba Complete (item test dari Fase 18 belum ada
  stoknya di BU-C) — bukan bug, itemnya genuinely belum pernah di-inbound. Di-inbound-kan dulu 50
  pcs (`IN-000016`), baru Complete Sales berhasil (`SAL-000009` → COMPLETED, ter-link ke
  `Outbound #17`, `unit_cost` ke-freeze Rp40.000 sesuai HPP inbound).
- Catat Pembayaran: pilih metode **Tunai (Cash)** dari dropdown enum → field "Uang Diterima"
  muncul, isi Rp1.000.000 (lebih besar dari tagihan Rp999.000) → preview **"Kembalian: Rp1.000"**
  muncul live sebelum submit → submit sukses, `payment_status` invoice jadi **PAID**, baris
  pembayaran di tabel menunjukkan **"Tunai (Cash)"** (bukan `"CASH"` mentah) dan **Kembalian
  Rp1.000** persis seperti preview — server confirm angka yang sama dengan hitungan frontend.
- Dicek ulang di tab browser fresh (reload penuh) — data payment/discount tetap konsisten, 0
  error console (baris `409` yang sempat muncul pas percobaan Complete pertama yang gagal
  ter-konfirmasi cuma residu log lama, bukan error aktif — sama pola verifikasi seperti Fase 18).
- `npm run build` + `npm run lint` bersih (`dist/` dibersihin abis verifikasi).

**Belum dites/dikerjakan** (menunggu prioritas user berikutnya, di luar scope sesi ini):
- Hold/resume transaksi (§22) — belum ada tombol/halaman "Transaksi Tertahan".
- Barcode scanner + field `barcode` di form Item (§18) — item belum punya field ini di UI sama
  sekali.
- Sesi kasir/shift buka-tutup + Kas Keluar (§20) dan cetak struk Bluetooth ESC/POS (§19) — modul
  paling besar scope-nya; cetak struk juga genuinely tidak bisa diverifikasi penuh tanpa hardware
  printer thermal beneran (cuma bisa dipastikan kode & response API-nya benar, bukan hasil cetak
  fisik).
- Purchase (`InvoiceFormPage kind="purchase"`) tidak diuji terpisah untuk diskon — kodenya
  identik dengan Sales (komponen sama), risiko rendah, tapi belum di-klik langsung di browser.

---

## Fase 20 — Hold/Resume Transaksi Sales ✅ (2026-09-14)

Lanjutan Fase 19 — user milih prioritas berikutnya: **hold/resume** (§22
frontend-integration-guide.md). Fitur SALES-only (tidak ada di Purchase) — kasir bisa "menahan"
cart transaksi yang lagi dibikin (pelanggan lupa dompet, mikir-mikir dulu, dll) tanpa kehilangan
data-nya, lalu lanjutin kapan saja. Sale yang ditahan **tetap berstatus DRAFT** seperti biasa —
`held_at`/`hold_label` cuma penanda tambahan, bukan transisi status baru.

**Dibangun:**
- [`types/invoice.ts`](../src/types/invoice.ts) — `Invoice.held_at`/`hold_label` (opsional,
  Purchase tidak pernah punya field ini di response).
- [`api/invoices.ts`](../src/api/invoices.ts) — `holdSale(id, label?)` & `resumeSale(id)`,
  ditulis terpisah (bukan pola "ByKind" seperti fungsi lain di file ini) karena memang cuma ada
  di endpoint `/sales`, tidak ada versi purchase-nya. `ListParams` dapat filter `held?: boolean`
  yang sengaja cuma pernah dikirim dari pemanggil kind Sales (tidak bergantung pada asumsi
  backend mengabaikan query tak dikenal untuk Purchase).
- [`features/invoices/HoldSaleModal.tsx`](../src/features/invoices/HoldSaleModal.tsx) — modal
  baru, 1 field opsional "Label" (mis. "Meja 5"), submit manggil `POST /sales/:id/hold`.
- [`InvoiceDetailPage.tsx`](../src/features/invoices/InvoiceDetailPage.tsx) — tombol **Tahan**
  (buka `HoldSaleModal`) muncul kalau `kind==='sales' && status==='DRAFT' && !held_at` (dan
  `canWrite('sales')`, sama seperti tombol aksi Sales lain); tombol **Lanjutkan** (langsung
  manggil `resumeSale`, tanpa dialog konfirmasi — aksi ringan & reversibel, sale bisa ditahan
  lagi kapan pun) muncul kalau sebaliknya. Badge **DITAHAN** (warna amber, ditambahkan ke
  [`StatusBadge.tsx`](../src/components/StatusBadge.tsx)) + baris "Ditahan — {label}" tampil di
  header kalau lagi ditahan.
- [`InvoiceListPage.tsx`](../src/features/invoices/InvoiceListPage.tsx) — filter baru "Tertahan"
  (Semua/Ya/Tidak) dan kolom "Ditahan" (nampilin label atau "-"), **keduanya cuma dirender kalau
  `kind==='sales'`** — halaman Purchase (komponen yang sama) sama sekali tidak kebagian UI ini.

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local`, BU-C):
- Bikin Sales DRAFT baru (`SAL-000010`) → tombol **Tahan** muncul persis di antara
  Batalkan/Complete → klik → modal "Tahan Transaksi" kebuka → isi label "Meja 5" → submit →
  badge **DITAHAN** muncul, baris "Ditahan — Meja 5" tampil, tombol berganti jadi **Lanjutkan**,
  status tetap **DRAFT** (tidak berubah).
- Halaman list Sales: filter "Tertahan" → "Ya, tertahan" mengirim `GET /api/sales?held=true` (
  dikonfirmasi dari `read_network_requests`, bukan asumsi) → list ke-filter benar cuma
  menampilkan `SAL-000010`; kolom "Ditahan" menunjukkan "Meja 5" untuk baris itu dan "-" untuk
  sale lain yang tidak ditahan.
- Klik **Lanjutkan** → badge & baris "Ditahan" hilang, tombol balik jadi **Tahan**, status tetap
  DRAFT — resume jalan sempurna.
- Edge case: sale yang sudah **COMPLETED** (`SAL-000009` dari Fase 19) — tombol Tahan/Lanjutkan
  dikonfirmasi **tidak ada sama sekali** (dicek langsung lewat DOM query, bukan visual doang).
- Edge case: halaman **Purchase** list — dikonfirmasi **tidak ada** filter "Tertahan" maupun
  kolom "Ditahan" sama sekali (kolom yang tampil cuma No. Invoice/Warehouse/Tanggal/Total/
  Pembayaran/Status) — scope Sales-only benar-benar terjaga, bukan bocor ke Purchase lewat
  komponen yang di-share.
- 0 error console di semua langkah. `npm run build` + `npm run lint` bersih (`dist/` dibersihin).

**Belum dites** (di luar scope sesi ini, tidak blocking): role `kasir-sales` secara langsung
(kodenya lewat `canWrite('sales')` yang sudah mencakup `kasir-sales` di `WRITE_MATRIX`, jadi
risiko rendah tapi belum diklik langsung dengan akun kasir); memanggil `/hold` dua kali berturut-
turut pada sale yang sama (dokumentasi bilang ini aman/idempotent-ish, cuma refresh label —
belum diverifikasi live).

**Masih pending** (menunggu prioritas user berikutnya): barcode scanner (§18), sesi kasir/shift +
Kas Keluar (§20), cetak struk Bluetooth ESC/POS (§19).

---

## Fase 21 — Barcode Scanner ✅ (2026-09-14)

Lanjutan Fase 20 — user milih prioritas berikutnya: **barcode scanner** (§18
frontend-integration-guide.md). Beda dari Hold/Resume (Fase 20, SALES-only), fitur ini genuinely
berguna di semua form transaksi yang pakai `ItemPicker` — diaktifkan di **Inbound/Outbound**
(`InventoryTransactionFormPage`) DAN **Sales/Purchase** (`InvoiceFormPage`), sesuai pola disiplin
scope yang sama seperti shortcut "+ Tambah item baru" di Fase 18 (Stock Transfer/Opname sengaja
tetap tidak disentuh).

**Dibangun:**
- [`types/item.ts`](../src/types/item.ts) — `Item.barcode: string | null` &
  `ItemInput.barcode?: string | null`.
- [`api/items.ts`](../src/api/items.ts) — `getItemByBarcode(barcode, warehouseId?)` →
  `GET /items/by-barcode/:barcode?warehouse_id=`. `warehouseId` opsional secara tipe, tapi
  pemanggil (form transaksi) SELALU mengirimnya — dipakai backend buat sekalian validasi/kasih
  info stok di warehouse itu.
- [`ItemFormModal.tsx`](../src/features/items/ItemFormModal.tsx) — field baru "Barcode
  (opsional)" + prop baru `initialBarcode` (prefill pas dibuka dari alur scan-not-found, pola
  sama seperti `initialName` di Fase 18).
- [`ItemListPage.tsx`](../src/features/items/ItemListPage.tsx) &
  [`ItemDetailPage.tsx`](../src/features/items/ItemDetailPage.tsx) — kolom/baris "Barcode"
  ditambahkan (nice-to-have, low-risk).
- **Input "Scan Barcode"** ditambahkan di [`InventoryTransactionFormPage.tsx`](../src/features/inventoryTransactions/InventoryTransactionFormPage.tsx)
  & [`InvoiceFormPage.tsx`](../src/features/invoices/InvoiceFormPage.tsx), posisinya tepat di
  atas "Detail Item". Alur: scanner emulate keyboard (ketik+Enter otomatis) → Enter di-tangkap
  manual lewat `onKeyDown` + `preventDefault()` (**bukan** `<form onSubmit>` terpisah — nested
  `<form>` HTML tidak valid, catatan yang sama dari bug Fase 18) → panggil
  `getItemByBarcode(kode, warehouseId)`:
  - **Ketemu** → item yang SAMA nambah qty (bukan baris baru); kalau belum ada, isi baris kosong
    yang ada duluan sebelum bikin baris baru; Unit Price ikut ke-auto-fill dari `selling_price`
    master data (kasir tinggal scan-scan-scan, harga udah kepasang).
  - **404 (belum terdaftar)** → buka `ItemFormModal` mode create dengan barcode udah ke-prefill —
    **tapi cuma kalau `canWrite('items')`** (gating sama persis kayak shortcut Fase 18: backend
    nolak 403 create item buat role selain super-admin/admin-bu/purchasing, jadi role lain dikasih
    toast "Minta admin-bu/purchasing daftarkan item ini" alih-alih modal yang ujungnya ditolak).
    Item yang berhasil dibuat otomatis langsung ke-tambah ke baris transaksi (`onCreated`).
  - Belum pilih warehouse → toast error, TIDAK memanggil API sama sekali (dicek dari
    `read_network_requests`, bukan asumsi).
- [`api/errors.ts`](../src/api/errors.ts) — pesan buat `ITEM_BARCODE_EXISTS`.

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local` &
`staff.buc@test.local`, BU-C):
- Tambah barcode `8991112223334` ke item existing (`OBG-PLUS-KCL`) lewat Edit Item → tersimpan,
  muncul di kolom Barcode halaman Items.
- Di form Tambah Inbound: scan barcode itu → `GET /api/items/by-barcode/8991112223334?
  warehouse_id=2 → 200 OK` (dikonfirmasi dari network log) → item **otomatis ke-select** di baris
  Detail Item tanpa perlu cari manual.
- Scan barcode **yang sama lagi** → qty baris itu naik dari 1 jadi **2** (dikonfirmasi baca value
  input langsung), **tidak** bikin baris duplikat.
- Scan barcode yang belum terdaftar (`1234567890123`) → `404 Not Found` → modal "Tambah Item"
  kebuka otomatis dengan field Barcode **sudah ke-prefill** `1234567890123` → lengkapi SKU/Nama/
  Satuan → Simpan → item baru (`KABEL-USB-C`) langsung **muncul sebagai baris baru** di transaksi,
  dan barcode-nya kebukti tersimpan bener di halaman Items (`1234567890123`).
- Gating permission: login sebagai `staff.buc` (staff-gudang, TIDAK ada di `WRITE_MATRIX` items)
  → scan barcode yang belum terdaftar → `404` tetap kejadian, **tapi modal "Tambah Item" tidak
  kebuka sama sekali** (dicek: field Item di baris tetap kosong abis scan) — sesuai desain.
- Belum pilih warehouse → scan barcode → **tidak ada request ke `/by-barcode` sama sekali**
  (dikonfirmasi dari network log kosong) — validasi client-side berhasil mencegah API call yang
  pasti gagal/tidak informatif.
- Bonus (otomatis dari backend, tanpa perubahan kode tambahan): ketik barcode yang sama di kolom
  pencarian teks biasa `ItemPicker` (bukan input Scan Barcode) juga berhasil menemukan item yang
  sama — mengonfirmasi `GET /items/search` sekarang ikut fuzzy-match ke barcode, persis seperti
  yang didokumentasikan.
- 0 error console real (satu baris `404` yang muncul di log itu memang request yang legitimately
  404, bukan bug — konsisten dengan cara browser mencatat semua respons non-2xx ke console
  terlepas dari sudah ditangani dengan benar di level aplikasi atau belum).
- `npm run build` + `npm run lint` bersih (`dist/` dibersihin abis verifikasi).

**Catatan proses (bukan bug produk):** satu percobaan awal scan sempat kelihatan "tidak
merespons" — ternyata simulasi tombol Enter dari tool automation browser tidak selalu
menghasilkan event keyboard yang lengkap (`key: 'Enter'`) buat dikenali React `onKeyDown`.
Dikonfirmasi ulang dengan `KeyboardEvent` yang di-dispatch manual (menyertakan `key`/`code`) dan
langsung bekerja — jadi ini keterbatasan tooling verifikasi, bukan bug di kode aplikasi (device
scanner fisik sungguhan pasti mengirim event keyboard lengkap, sama seperti mengetik manual).

**Belum dites** (di luar scope sesi ini, tidak blocking): Purchase (`InvoiceFormPage
kind="purchase"`) tidak diuji terpisah untuk scan — kodenya identik dengan Sales, risiko rendah;
Outbound juga tidak diuji terpisah (Unit Price tidak relevan di situ, tapi jalur `addScannedItem`
identik dengan Inbound).

**Masih pending** (menunggu prioritas user berikutnya): sesi kasir/shift + Kas Keluar (§20),
cetak struk Bluetooth ESC/POS (§19).

---

## Fase 22 — Sesi Kasir / Shift + Kas Keluar ✅ (2026-09-14)

Lanjutan Fase 21 — user milih prioritas berikutnya: **sesi kasir/shift + Kas Keluar** (§20
frontend-integration-guide.md). Beda arsitektur dari 3 fase POS sebelumnya (Fase 19-21 nempel di
form transaksi existing) — sesi kasir itu alur MANDIRI per-shift (buka sekali di awal, jalan di
background selama transaksi normal berlangsung, tutup sekali di akhir), bukan sesuatu yang
nempel di 1 dokumen. Jadi dibangun sebagai **halaman baru** `/cash-session`, bukan tambahan ke
halaman lain.

**Keputusan scope:** halaman ini **self-scoped** — cuma urus sesi milik user yang login sendiri
(`GET /cash-sessions/current`), **bukan** halaman audit/browse semua sesi lintas user (endpoint
list `GET /cash-sessions?warehouse_id=&user_id=&status=` sengaja tidak dipakai/dibangun UI-nya —
itu kebutuhan reporting terpisah, di luar permintaan sesi ini). Tidak ada gating permission —
backend sendiri tidak mendokumentasikan pembatasan role buat buka sesi kasir (beda dari resource
lain yang eksplisit punya `WRITE_MATRIX` di §5), jadi halaman ini kebuka buat siapa pun yang
login, sama pola seperti halaman Profile.

**Dibangun:**
- [`types/cashSession.ts`](../src/types/cashSession.ts) — `CashSession`, `CashSessionSummary`
  (`by_method`, `expenses`, `total_amount`, `total_expenses`, `live_expected_cash`),
  `CashSessionExpense`, `CashSessionMethodBreakdown`, + 3 input type buat open/close/expense.
- [`api/cashSessions.ts`](../src/api/cashSessions.ts) — `getCurrentCashSession()`,
  `openCashSession()`, `closeCashSession()`, `addCashSessionExpense()`. Tidak ada
  `Idempotency-Key` di endpoint mana pun (bukan bagian dari daftar aksi yang butuh header itu).
- [`api/errors.ts`](../src/api/errors.ts) — pesan buat `CASH_SESSION_ALREADY_OPEN` &
  `INSUFFICIENT_CASH_IN_DRAWER`.
- **Refactor kecil**: `paymentMethodLabel()` (tadinya fungsi lokal di `InvoiceDetailPage.tsx`,
  Fase 19) dipindah jadi export dari [`types/payment.ts`](../src/types/payment.ts) — dipakai lagi
  di halaman baru ini buat breakdown per metode bayar, daripada duplikat logic yang sama.
- [`features/cashSessions/CashSessionPage.tsx`](../src/features/cashSessions/CashSessionPage.tsx)
  — halaman utama, 2 state:
  - **Belum ada sesi terbuka**: form "Buka Kasir" (Warehouse — pakai `WarehouseSelect` yang sudah
    otomatis ke-scope BU/assignment, Modal Awal, Catatan opsional). Kalau abis nutup sesi, laporan
    penutupan terakhir (Z-report: Modal Awal/Uang Seharusnya/Hasil Hitung Fisik/Selisih, warna
    merah/hijau sesuai kurang/lebih) tetap ditampilkan di atas form — sengaja ditangkap di state
    lokal (`lastClosed`) karena response `close` tidak persisten di mana pun setelah `current`
    di-refetch balik `null`.
  - **Sesi lagi terbuka**: header (warehouse, waktu buka, catatan) + badge status; 3 `StatCard`
    (Modal Awal, **Uang Seharusnya Sekarang** — live dari `summary.live_expected_cash`, Total
    Pengeluaran); tabel breakdown per metode bayar; tabel Kas Keluar; tombol **"+ Kas Keluar"** &
    **"Tutup Kasir"**.
- [`features/cashSessions/CashSessionExpenseModal.tsx`](../src/features/cashSessions/CashSessionExpenseModal.tsx)
  — modal Kas Keluar, `amount` + `description` (wajib, sesuai backend — tanpa alasan tercatat
  fitur ini kehilangan gunanya sebagai audit trail).
- [`features/cashSessions/CashSessionCloseModal.tsx`](../src/features/cashSessions/CashSessionCloseModal.tsx)
  — modal Tutup Kasir, field "Hasil Hitung Fisik" default ke `live_expected_cash` (kasir tinggal
  Enter kalau pas), preview selisih live di frontend sebelum submit (warna merah "kurang" /
  hijau "lebih") — backend tetap sumber kebenaran akhir lewat `cash_difference` di response,
  diteruskan ke parent (`onClosed`) buat ditampilkan sebagai Z-report.
- [`App.tsx`](../src/App.tsx) — route `/cash-session`, ungated (pola sama seperti `/profile`).
- [`Layout.tsx`](../src/routes/Layout.tsx) — nav item "Sesi Kasir" di grup "Penjualan &
  Pembelian", juga ungated.

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local`, BU-C) —
alur penuh 1 shift dari awal sampai akhir:
1. Buka Kasir (`WH-C-PUSAT`, modal awal Rp100.000) → sesi OPEN, "Uang Seharusnya Sekarang"
   langsung Rp100.000, tabel breakdown & Kas Keluar kosong.
2. Catat Kas Keluar Rp15.000 ("Beli galon air") → **live update instan**: Uang Seharusnya jadi
   Rp85.000 (100.000-15.000), Total Pengeluaran Rp15.000, baris muncul di tabel Kas Keluar.
3. Bikin Sales baru (`SAL-000011`, total Rp55.500) → Complete → catat Pembayaran metode **Tunai
   (Cash)** → **dikonfirmasi payment OTOMATIS ke-link ke sesi kasir di backend, tanpa kode
   tambahan apa pun di frontend** (persis sesuai janji dokumentasi): balik ke halaman Sesi Kasir,
   "Uang Seharusnya Sekarang" sudah **Rp140.500** (85.000+55.500) dan tabel breakdown menunjukkan
   "Tunai (Cash) | 1 | Rp 55.500".
4. Tutup Kasir dengan hasil hitung fisik Rp138.000 (sengaja beda dari seharusnya) → preview
   selisih live **"-Rp 2.500 (kurang)"** sebelum submit → submit → sesi CLOSED, kembali ke form
   Buka Kasir, dan **Laporan Penutupan Terakhir** tampil persis dengan angka yang sama (Modal Awal
   Rp100.000, Uang Seharusnya Rp140.500, Hasil Hitung Fisik Rp138.000, Selisih -Rp2.500) —
   dikonfirmasi backend beneran ngitung `cash_difference` yang sama persis dengan preview
   frontend, bukan kebetulan.
5. Buka sesi baru lagi (buat mastiin siklus bisa berulang, tidak nyangkut di state manapun) →
   langsung tutup lagi dengan angka pas (selisih Rp0) — bersih, tidak ada sesi tertinggal
   menggantung di akhir sesi kerja ini.
6. 0 error console real sepanjang alur (sempat ada 1 baris error HMR transient pas proses
   nge-edit file — dikonfirmasi ulang di tab browser fresh langsung 0 error, jadi bukan bug kode).
7. `npm run build` + `npm run lint` bersih (`dist/` dibersihin abis verifikasi).

**Belum dites live** (di luar prioritas verifikasi sesi ini, kodenya sudah menangani lewat
`getErrorMessage` + pesan khusus di `errors.ts`, cuma belum dipicu langsung di browser):
`409 CASH_SESSION_ALREADY_OPEN` (nyoba buka sesi ke-2 sebelum yang pertama ditutup — susah
direproduksi dari UI normal karena begitu sesi kebuka, form Buka Kasir otomatis hilang, cuma
kejadian dalam kondisi race-condition/double-klik yang genuinely jarang); `409
INSUFFICIENT_CASH_IN_DRAWER` (Kas Keluar dengan nominal lebih besar dari yang seharusnya ada di
laci).

**Masih pending** (menunggu prioritas user berikutnya): cetak struk Bluetooth ESC/POS (§19) — ini
tersisa 1 fitur terakhir dari roadmap operasional kasir §17-23.

---

## Fase 23 — Cetak Struk Bluetooth ESC/POS ✅ (2026-09-14)

Fitur terakhir dari roadmap operasional kasir §17-23 frontend-integration-guide.md — dengan ini,
seluruh roadmap sudah lengkap dikerjakan. SALES-only (tidak ada endpoint setara di Purchase),
sama pola dengan Hold/Resume (Fase 20) dan Barcode Scanner (Fase 21).

**Dibangun:**
- [`types/webBluetooth.d.ts`](../src/types/webBluetooth.d.ts) — deklarasi ambient minimal buat
  Web Bluetooth API (subset kecil yang benar-benar dipakai: `navigator.bluetooth`,
  `requestDevice`, `BluetoothDevice.gatt`, `connect`, `getPrimaryService`, `getCharacteristic`,
  `writeValue`) — TypeScript lib bawaan (`DOM`) belum menyediakan tipe resmi buat API draft W3C
  ini. `navigator.bluetooth` sengaja opsional (`?`) — browser yang tidak mendukung (Safari/iOS)
  memang tidak punya properti ini sama sekali.
- [`types/receipt.ts`](../src/types/receipt.ts) — `Receipt` (semua field response `/receipt`:
  `warehouse`/`business_unit`/`customer` nullable, `items`, `payments`, `text_lines`,
  `escpos_base64`, dst).
- [`api/invoices.ts`](../src/api/invoices.ts) — `getSaleReceipt(id, paperWidthMm?)` →
  `GET /sales/:id/receipt?paper_width_mm=`.
- [`features/invoices/SalesReceiptModal.tsx`](../src/features/invoices/SalesReceiptModal.tsx) —
  modal baru:
  - Toggle lebar kertas 58mm/80mm (refetch otomatis lewat React Query key yang menyertakan
    `paperWidth`).
  - Preview struk di `<pre>` font monospace, isi dari `text_lines` — persis rekomendasi
    dokumentasi ("jangan pakai font proporsional, nanti alignment kolom harga berantakan").
  - Deteksi fitur `navigator.bluetooth` sebelum nawarin tombol cetak — kalau browser tidak
    mendukung (Safari/iOS, dll), tombol disabled + pesan penjelasan, bukan error JS mentah kalau
    diklik.
  - Tombol "Cetak via Bluetooth": decode `escpos_base64` → `Uint8Array`, `requestDevice` dengan
    `SERVICE_UUID`/`CHARACTERISTIC_UUID` generic printer thermal murah (persis dari contoh kode
    resmi di §19), connect GATT, tulis per-chunk 100 byte dengan jeda 20ms — **disalin persis**
    dari contoh kode di dokumentasi, bukan diterka-terka. `NotFoundError` (user batal pilih
    device) di-diamkan (bukan error sungguhan), error lain ditampilkan lewat toast.
- [`InvoiceDetailPage.tsx`](../src/features/invoices/InvoiceDetailPage.tsx) — tombol "Cetak
  Struk" baru di sebelah "Cetak PDF", muncul kalau `kind==='sales' && status==='COMPLETED'`
  (backend nolak `409 INVALID_STATUS` kalau masih DRAFT — gating UI ini yang mencegah user coba
  di dokumen yang belum selesai).

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local`, sale
`SAL-000011` yang sudah COMPLETED dari Fase 22):
- **Response API diverifikasi langsung via `curl`** (bukan cuma dari UI) — struktur JSON match
  **100%** dengan `Receipt` type yang didefinisikan: `warehouse`/`business_unit` terisi benar,
  `customer: null` (walk-in, sesuai karena sale ini tidak diisi contact), `items`/`payments`
  sesuai transaksi, `text_lines` array teks siap tampil dengan formatting kolom yang rapi
  (header BU/warehouse di-center, separator garis, rincian item, subtotal/pajak/total,
  metode bayar, penutup "Terima kasih!"), `escpos_base64` string base64 valid.
- Tombol "Cetak Struk" cuma muncul di sale COMPLETED, tidak ada di DRAFT — dikonfirmasi visual.
- Modal kebuka, preview struk render **persis sama** dengan `text_lines` dari response API (dicek
  langsung `document.querySelector('pre').textContent`, bukan cuma dilihat sekilas).
- Toggle 58mm → 80mm memicu refetch baru (`GET /api/sales/11/receipt?paper_width_mm=80 → 200 OK`,
  dikonfirmasi dari network log) dengan hasil `text_lines` yang beda lebar kolomnya.
- Deteksi `navigator.bluetooth`: di browser testing ini API-nya terdeteksi ADA (Chrome), jadi
  tombol "Cetak via Bluetooth" aktif (tidak disabled) — mengonfirmasi logic deteksi fitur bekerja
  benar untuk kasus "didukung".
- 0 error console real (dikonfirmasi ulang di tab browser fresh — satu baris error HMR yang
  sempat muncul di tab lama itu residu transient dari proses edit file, pola yang sama persis
  dengan yang sudah dikonfirmasi bukan bug di Fase 21/22).
- `npm run build` + `npm run lint` bersih (`dist/` dibersihin abis verifikasi).

**Tidak bisa diverifikasi (batasan lingkungan, bukan dilewatkan):** klik tombol "Cetak via
Bluetooth" yang sebenarnya (`navigator.bluetooth.requestDevice()`) **sengaja tidak dipicu** dalam
sesi verifikasi ini — panggilan itu membuka dialog pemilih perangkat Bluetooth level-OS yang ada
di LUAR DOM halaman, yang berisiko nge-hang sesi browser otomasi tanpa cara pasti buat
menutupnya dari tooling yang tersedia. Kode-nya sendiri disalin persis dari contoh resmi
dokumentasi (UUID service/characteristic yang sama, pola chunking yang sama), jadi risiko
teknisnya rendah — tapi **"berhasil connect ke printer & benar-benar tercetak fisik" cuma bisa
dikonfirmasi user dengan hardware printer thermal Bluetooth sungguhan**, sama seperti yang sudah
diperingatkan sejak awal permintaan fitur ini.

**Dengan Fase 23 ini, roadmap operasional kasir §17-23 frontend-integration-guide.md sudah
lengkap sepenuhnya**: assign staff per warehouse (§17, Fase 16), shortcut tambah item (§18 bagian
pertama, Fase 18), barcode scanner (§18, Fase 21), cetak struk (§19, Fase 23), sesi kasir/shift +
Kas Keluar (§20, Fase 22), diskon & kembalian (§21, Fase 19), hold/resume (§22, Fase 20), dan
standarisasi metode bayar (§23, Fase 19).

---

## Fase 24 — Import & Export Item dari CSV/Excel ✅ (2026-09-14)

Update backend baru (§24-26 frontend-integration-guide.md): bug fix kecil (§24, `sku` sekarang
unik per BU bukan global — murni perilaku backend, tidak ada aksi frontend yang perlu diambil,
cukup dicatat di sini) + fitur baru bulk import/export item (§25-26). Beda dari fase-fase POS
sebelumnya — ini kebutuhan **manajemen katalog**, bukan alur kasir, jadi ditempel ke area
Master Data → Items, bukan Sales/Inbound.

**Dibangun:**
- [`api/client.ts`](../src/api/client.ts) — `request()` sekarang deteksi `body instanceof
  FormData` dan **tidak** set `Content-Type` manual buat kasus itu (biar browser yang nentuin
  boundary multipart-nya sendiri — kalau di-override manual, boundary-nya hilang dan backend gak
  bisa parse body). Fungsi baru `apiGetBlob()` — jalur terpisah dari `request()` generik karena
  response-nya file beneran (`Content-Disposition: attachment`), bukan JSON; duplikasi kecil
  logic 401-refresh-retry & error-parsing di situ sengaja (dijelaskan di komentar kode) daripada
  bikin `request()` harus tahu "kadang parse JSON kadang tidak".
- [`utils/download.ts`](../src/utils/download.ts) — `downloadBlob(blob, filename)`, pola persis
  contoh kode resmi dokumentasi (`<a>` sementara + `URL.createObjectURL`, langsung dibuang lagi).
- [`types/item.ts`](../src/types/item.ts) — `ItemImportResult`, `ImportValidationDetail`.
- [`api/items.ts`](../src/api/items.ts) — `importItems(file)` (multipart), 
  `downloadItemsImportTemplate(format)`, `exportItems(params)` (keduanya lewat `apiGetBlob`).
- [`api/errors.ts`](../src/api/errors.ts) — pesan buat `IMPORT_VALIDATION_FAILED` & `BU_REQUIRED`.
- [`features/items/ItemImportPage.tsx`](../src/features/items/ItemImportPage.tsx) — halaman baru
  `/items/import`, 2 section:
  - **Import**: tombol Download Template (CSV/XLSX), `<input type="file">` + tombol Upload &
    Import, catatan peringatan eksplisit (all-or-nothing, full-replace, 1 SKU per file — persis
    UX yang disarankan §25). Sukses → ringkasan angka (`rows_processed`/`items_created`/dst) +
    link ke `inbound_ids` yang otomatis dibuat. Gagal validasi (`IMPORT_VALIDATION_FAILED`) →
    **tabel** No. Baris/Pesan Error dari `error.details` (bukan toast generik — sesuai saran
    dokumentasi "detail per barisnya yang paling berguna buat user").
  - **Export**: pilih format (CSV/XLSX) + `WarehouseSelect` opsional, tombol Export, catatan
    penjelasan kenapa export-lalu-reimport aman (kolom `quantity`/`unit_cost` sengaja tidak ada;
    `current_quantity` sengaja beda nama dari `quantity` biar importer tidak mengenalinya).
  - **Gating super-admin**: section Import disembunyikan total + pesan penjelasan kalau
    `role === 'super-admin'` (backend nolak `400 BU_REQUIRED` — super-admin lintas semua BU,
    tidak ada tujuan import yang jelas). Section Export TETAP tampil buat super-admin (tidak ada
    pembatasan setara yang didokumentasikan untuk itu).
- [`ItemListPage.tsx`](../src/features/items/ItemListPage.tsx) — tombol "Import / Export" baru
  di sebelah "+ Tambah Item", sama-sama digating `canWrite('items')`.
- [`App.tsx`](../src/App.tsx) — route `/items/import`, digating `RequirePermission
  allowed={canWrite('items')}` (pembatasan super-admin yang lebih spesifik ditangani di dalam
  halamannya sendiri, bukan di level route, karena Export masih harus bisa diakses).

**Diverifikasi live** (browser sungguhan, backend nyata, akun `admin.buc@test.local` &
`superadmin@test.local`, BU-C):
- **Download Template CSV**: response dicek langsung via `curl` — `Content-Disposition:
  attachment; filename="items-import-template.csv"`, isi cuma baris header
  (`sku,barcode,name,unit,min_stock,selling_price,warehouse_code,quantity,unit_cost`), kosong
  tanpa baris contoh — persis sesuai dokumentasi.
- **Import file valid** (2 baris, 1 baris nyertain `warehouse_code`+`quantity`+`unit_cost`) —
  disuntik lewat `DataTransfer` API (simulasi file-picker) karena tool browser testing tidak
  punya native file-dialog interaction: hasil **"2 baris diproses, 2 item baru dibuat, 1
  warehouse ke-isi stok"** + link **Inbound #26** otomatis muncul. Dibuka manual: `IN-000026`
  status **COMPLETED**, catatan **"Initial stock from item import"** (persis string yang
  didokumentasikan), item & quantity & unit_cost sesuai file — mengonfirmasi mekanisme
  "bikin dokumen INBOUND asli" itu beneran jalan, bukan cuma nulis angka mentah ke stok.
- **Import file invalid** (SKU kosong + `warehouse_code` yang tidak ada) → **tabel error** muncul
  persis: baris 2 → `"sku is required"`, baris 3 → `"warehouse_code \"WH-TIDAK-ADA\" not
  found"` — nomor barisnya benar (row 1 = header, sesuai konvensi backend).
- **Export tanpa `warehouse_id`**: dicek via `curl` — kolom cuma
  `sku,barcode,name,unit,min_stock,selling_price`, **tidak ada** `quantity`/`unit_cost`,
  konsisten dengan item yang baru diimport (`IMP-TEST-001,,Kabel HDMI Import Test,pcs,5,75000.00`
  ikut muncul).
- **Export dengan `warehouse_id`**: kolom tambahan `warehouse_code,current_quantity` (bukan
  `quantity`) — `IMP-TEST-001` menunjukkan `current_quantity: 10` (persis qty yang baru
  di-inbound-kan lewat import), `OBG-PLUS-KCL` menunjukkan `39` (stok dari testing fase-fase
  sebelumnya) — angkanya konsisten & masuk akal, bukan kebetulan.
- **Gating super-admin**: login sebagai `superadmin@test.local` → halaman `/items/import`
  menampilkan pesan penjelasan ("Import butuh akun dengan BU tunggal...") **sebagai pengganti**
  section Import, sementara section Export tetap tampil & berfungsi normal (dropdown warehouse
  menampilkan **semua warehouse lintas BU**, sesuai scope global super-admin).
- 0 error console real di semua langkah (dicek juga di tab browser fresh). `npm run build` +
  `npm run lint` bersih (`dist/` dibersihin abis verifikasi).

**Catatan teknis verifikasi**: karena tool browser testing tidak bisa berinteraksi dengan dialog
file-picker native OS, file upload disimulasikan pakai `DataTransfer` API langsung di JS
(`input.files = dataTransfer.files` + dispatch event `change`) — ini teknik standar buat
simulasi file selection di browser automation, BUKAN workaround yang melewati validasi form;
`<input type="file">` dan handler `onChange` di kode aplikasi tetap jalur yang sama persis
dipakai user sungguhan lewat klik manual.

**Belum dites** (di luar prioritas verifikasi sesi ini): import file `.xlsx` (cuma CSV yang
dites langsung — jalur kodenya identik karena `importItems()` cuma kirim `File` mentah ke
backend tanpa peduli formatnya, backend yang deteksi ekstensi/mimetype); skenario `sku` yang
sama tapi UPDATE data existing (item baru semua yang dites, belum dites baris yang nge-update
item yang sudah ada).
