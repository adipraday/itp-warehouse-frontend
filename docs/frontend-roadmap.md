# Roadmap Frontend Development — Warehouse System

Roadmap ini disusun berdasarkan analisis [api-documentation.md](./api-documentation.md).
Stack: **React + Vite + TypeScript + Tailwind CSS**.

Setiap fase diasumsikan sequential (fase berikutnya bergantung pondasi dari fase sebelumnya), tapi modul dalam satu fase bisa dikerjakan paralel/independen.

---

## Fase 0 — Project Setup & Foundation

- Init project: Vite + React + TypeScript.
- Setup Tailwind CSS (config, base styles, design token dasar: warna status DRAFT/COMPLETED/CANCELLED/dll).
- Setup routing (React Router) dengan struktur folder per modul.
- Setup state/data-fetching layer (React Query/TanStack Query — cocok untuk pola list+pagination+mutation di dokumen ini).
- Struktur folder awal:
  ```
  src/
    api/           # api client + per-module service functions
    types/         # TypeScript types dari schema API
    components/    # shared UI components
    features/      # 1 folder per modul (warehouses, items, sales, dst)
    hooks/
    utils/
    routes/
  ```
- `.env` untuk `VITE_API_BASE_URL` (default `http://localhost:3000/api`).

**Output:** project bisa `npm run dev`, hit `GET /health` (di luar prefix `/api`), tampil "OK" di halaman awal.

---

## Fase 1 — Core Infrastructure (dipakai semua modul)

Ini fondasi yang paling menentukan konsistensi seluruh app — dikerjakan sebelum modul apa pun.

- **API client wrapper**: handle response envelope (`{data}` / `{data,meta}` / `{error}`), auto-throw pada `error.code` supaya bisa ditangkap seragam.
- **`withIdempotencyKey()` helper**: generate `crypto.randomUUID()`, dipasang ke header `Idempotency-Key` khusus endpoint `complete`/`approve` (stock-opname) — key disimpan di state komponen selama proses submit-retry berlangsung.
- **Utils**: formatter uang (parse string desimal API → number aman, format ke Rupiah), formatter tanggal (`YYYY-MM-DD`) vs timestamp (`YYYY-MM-DD HH:mm:ss.SSS`).
- **Error handling global**: mapping tabel kode error (§2 dokumentasi) ke pesan toast/inline yang manusiawi (mis. `INSUFFICIENT_STOCK`, `AMOUNT_EXCEEDS_BALANCE`, `IDEMPOTENCY_KEY_REUSED`).
- **Shared components**: DataTable (dengan pagination `page`/`per_page`), FilterBar, StatusBadge, Modal/Dialog, FormField set, ConfirmDialog (untuk aksi ireversibel: complete/approve/cancel/delete), Toast/notification.
- **`useDocumentActions(status)` hook**: pola generik untuk menentukan tombol aksi yang valid berdasarkan status dokumen — dipakai di 7 modul dengan document lifecycle (inbound, outbound, transfer, opname, sales, purchase, return).
- **TypeScript types**: definisikan types untuk tiap object di dokumentasi (Warehouse, Item, Contact, Stock, StockMutation, CostLayer, dst) sebagai referensi tunggal.

**Output:** semua "lego block" siap dipakai modul-modul berikutnya, tidak ada modul yang reinvent pattern sendiri.

---

## Fase 2 — Master Data (paling sederhana, sekaligus uji coba pondasi Fase 1)

Modul: **Warehouses**, **Items**, **Contacts**.

- List (paginated) + filter dasar (`type` untuk contacts).
- Create/Edit form + validasi sesuai schema (`code` unik ≤50, `sku` unik ≤50, dll).
- Delete khusus Warehouses (dengan handle `409 WAREHOUSE_REFERENCED`). Items **tidak ada delete**.
- Items: search-as-you-type (`GET /items/search?q=`), halaman detail dengan tab stok lintas warehouse (`/items/:id/stocks`) dan cost/cost-history (`/items/:id/cost`).
- Warehouses: halaman detail dengan tab stok per item (`/:id/stocks`) dan stock-summary card.

**Kenapa duluan:** murni CRUD tanpa state machine, jadi validasi pondasi Fase 1 (API client, form, table) sebelum masuk modul kompleks.

---

## Fase 3 — Read-Only Reports

Modul: **Stocks**, **Stock Mutations (Ledger)**, **Cost Layers/HPP**.

- Tabel filter berlapis (`warehouse_id`, `item_id`, `type`, `direction`, `source_type`, `remaining_only`, range tanggal).
- Halaman "Low Stock" & "Out of Stock" (dari `/stocks/low-stock`, `/stocks/out-of-stock`) — bisa jadi widget di Dashboard juga.
- Traceability: dari Stock Mutation, link ke dokumen sumber via `source_type`+`source_id`.

**Kenapa sebelum modul transaksi:** data di sini adalah *hasil* dari modul Fase 4+, berguna untuk verifikasi manual saat testing modul-modul berikutnya.

---

## Fase 4 — Inventory Transactions (Inbound & Outbound)

Modul: **Inbound**, **Outbound** — struktur identik, dikerjakan bareng.

- List dengan filter (`warehouse_id`, `status`, `from`, `to`).
- Form create/edit DRAFT: header + multi-baris detail item (tambah/hapus baris, pilih item via search, qty, unit_price).
- Aksi: Complete (+ Idempotency-Key, confirm dialog karena efek stok permanen), Cancel, Delete (hanya DRAFT).
- Halaman detail menampilkan `details[]` (list response tidak menyertakan ini — fetch ulang by id).
- Reversal flow: form baru dengan `reversal_of_transaction_id` + `reversal_reason` wajib kalau dipilih.

**Ini modul pertama yang pakai full document lifecycle pattern dari Fase 1** — jadi validasi `useDocumentActions` dan idempotency helper di sini.

---

## Fase 5 — Stock Transfer

- List + detail + form (`source_warehouse_id` ≠ `destination_warehouse_id`, validasi client-side sebelum submit untuk UX, tetap handle `400 SAME_WAREHOUSE` dari server).
- 3-stage lifecycle: DRAFT → **Approve** (tanpa Idempotency-Key) → **Complete** (dengan Idempotency-Key) → atau Cancel.
- Detail item hanya `item_id`+`quantity` (tidak ada input cost/harga — beda dari inbound/outbound).

---

## Fase 6 — Stock Opname

- Form create: input `physical_qty` per item; `system_qty` **read-only**, muncul setelah backend snapshot (bukan dihitung frontend).
- 3-stage lifecycle: DRAFT → **Submit** → **Approve** (+ Idempotency-Key) → atau Cancel.
- Preview `difference` (physical − system) di UI sebelum submit, dengan indikator visual (surplus/defisit/sesuai) — walau perhitungan final tetap dari backend.

---

## Fase 7 — Sales, Purchases, Payments

Modul: **Sales**, **Purchases**, **Payments** — dikerjakan bareng karena saling terkait (invoice + pembayaran).

- Form invoice: header + `tax_rate` (0–1) + multi-baris detail. **Jangan** render/kirim field `subtotal`/`tax`/`total_amount` — itu computed, tampilkan sebagai preview read-only hasil kalkulasi lokal (estimasi) tapi actual value dari response backend.
- Purchases: struktur identik Sales, beda `type` dan prefix nomor dokumen — pertimbangkan 1 komponen form yang di-reuse untuk keduanya.
- Sales: pertimbangkan UI terpisah untuk mode **POS/kasir** (search cepat item, cart-like input) vs mode **backoffice** (form standar) — sama-sama hit `POST /api/sales`.
- Payments: form input amount dengan validasi client-side terhadap sisa tagihan (ambil dari invoice detail) sebelum submit, untuk kurangi kena `409 AMOUNT_EXCEEDS_BALANCE`. Tampilkan riwayat pembayaran + `payment_status` badge di halaman invoice.
- Halaman detail invoice: tampilkan `unit_cost`/`cost_amount` di baris Sales hanya setelah COMPLETED (masih `"0.00"` saat DRAFT — beri indikator "akan terisi setelah complete").

---

## Fase 8 — Invoices (Gabungan) & Cross-Module Views

- Halaman "Semua Invoice" read-only: gabungan Sales + Purchase dengan filter `type`, `payment_status`, `status`, `warehouse_id`.
- Link dari sini ke halaman detail Sales/Purchase asli untuk aksi edit (resource ini murni read).

---

## Fase 9 — Returns (modul paling kompleks, dikerjakan terakhir sebelum Dashboard)

- Form wizard/conditional: pilih `type` (RETURN_CUSTOMER/RETURN_SUPPLIER) dulu → field origin berubah (`original_invoice_id` vs `original_inventory_transaction_id`) → per baris detail, field `condition` & `action` saling membatasi:
  - `condition: DAMAGED` → auto-set/lock `action: SCRAP`.
  - `action: REPLACE` → hanya muncul sebagai opsi kalau `type: RETURN_CUSTOMER` + `condition: GOOD`.
- Validasi eligible quantity: idealnya fetch sisa quantity yang masih boleh diretur dari dokumen asal sebelum submit (mengurangi kena `409 RETURN_QUANTITY_EXCEEDS_ELIGIBLE`), walau enforcement tetap di backend.
- 3-stage lifecycle: DRAFT → **Approve** → **Complete** (+ Idempotency-Key) → atau Reject/Cancel.
- Halaman detail: tampilkan `replacement_inventory_transaction_id` sebagai link ke outbound replacement kalau ada baris REPLACE yang sukses.
- `unit_cost` selalu dari backend (frozen HPP) — tidak ada input cost di form sama sekali.

---

## Fase 10 — Dashboard / Reporting

- Landing page setelah login (walau belum ada auth) — ringkasan harian (`/dashboard/summary`).
- Cards: stock summary, sales summary, purchases summary, profit (revenue/COGS/margin).
- Chart sederhana untuk sales/purchases per rentang tanggal (`from`/`to`), fetch 5 endpoint dashboard secara paralel.
- Widget low-stock/out-of-stock (reuse dari Fase 3) di sini.

**Kenapa terakhir:** dashboard mengagregasi data dari semua modul lain, paling masuk akal dikerjakan setelah modul sumber datanya ada & bisa diuji dengan data nyata.

---

## Fase 11 — Polish & Hardening

- Loading states & skeleton untuk semua list/detail.
- Empty states yang informatif per modul.
- Konsistensi confirm dialog untuk semua aksi ireversibel (complete/approve/cancel/delete/reject).
- Review aksesibilitas dasar (label form, focus state, kontras Tailwind).
- Review semua tempat yang butuh Idempotency-Key sudah benar diimplementasi (checklist ke §Idempotency-Key dokumentasi).
- Manual test tiap workflow end-to-end sesuai §20 Alur Kerja Umum di dokumentasi API (A–F).
- Siapkan struktur yang gampang ditambah auth nanti (dokumentasi bilang belum ada auth — tapi struktur route/layout sebaiknya sudah antisipasi penambahan itu tanpa refactor besar).

---

## Urutan Ringkas

```
Fase 0  → Setup project
Fase 1  → Core infrastructure (API client, utils, shared components)
Fase 2  → Master data (Warehouses, Items, Contacts)
Fase 3  → Read-only reports (Stocks, Mutations, Cost Layers)
Fase 4  → Inbound & Outbound
Fase 5  → Stock Transfer
Fase 6  → Stock Opname
Fase 7  → Sales, Purchases, Payments
Fase 8  → Invoices (gabungan)
Fase 9  → Returns
Fase 10 → Dashboard
Fase 11 → Polish & hardening
```

Status: **✅ Selesai (12/12 fase)** — seluruh roadmap rampung per 2026-08-26. Detail progress, keputusan teknis, dan bug yang ditemukan/diperbaiki tiap fase ada di [progress-log.md](./progress-log.md).

Fase 12 & 12.1 (Auth, RBAC & Audit — di luar 12 fase awal) juga sudah selesai, lihat progress-log.md.
**Fase 13 di bawah ini BELUM dikerjakan** — rencana untuk 2 halaman yang masih hilang: Profile & User Management.

---

## Fase 13 — Profile & User Management (belum dikerjakan)

Susulan Fase 12. Auth-backend (`:5020`) sudah punya semua endpoint yang dibutuhkan (dikonfirmasi
langsung dari sisi backend, termasuk hasil test end-to-end) — frontend belum punya UI-nya sama sekali.
Dua halaman:

1. **Profile** (`/profile`) — semua role, lihat & edit data sendiri.
2. **User Management** (`/users`) — `super-admin` & `admin-bu`, kelola user dalam ruang lingkup BU.

### 13.0 Prasyarat: client HTTP untuk auth-backend

Endpoint-endpoint di fase ini **bukan** di warehouse-backend (`:3000/api/*`, lewat proxy Vite,
envelope `{data}`/`{data,meta}`/`{error:{code,message,details}}`) — mereka di auth-backend (`:5020`,
langsung tanpa proxy, envelope **beda**: `{success, data, message}` atau `{success:false, message}`),
persis pola yang sudah dipakai [`src/auth/authApi.ts`](../src/auth/authApi.ts) untuk login/refresh.

**Jangan pakai `apiGet`/`apiPost`/`ApiError` dari [`src/api/client.ts`](../src/api/client.ts) untuk
endpoint di fase ini** — parsing envelope-nya bakal salah (field yang dicari beda struktur).

Yang perlu dibuat:
- Generalisasi `authApi.ts` (atau file baru `src/auth/authClient.ts`) jadi `authGet/authPost/authPut/authPatch/authDelete<T>(path, ...)`:
  - Base URL `import.meta.env.VITE_AUTH_API_URL`, langsung (tanpa prefix `/api`, tanpa proxy).
  - Header `Authorization: Bearer ${authStore.getAccessToken()}` di setiap request (login/refresh sekarang tidak butuh ini, tapi endpoint baru semua butuh).
  - Parse `{success:true, data}` → return `data`; `{success:false, message}` → `throw AuthApiError` (class-nya sudah ada di `authApi.ts`, tinggal dipakai bersama).
  - **401 → refresh → retry sekali**, pola identik `client.ts` (`authStore.refreshAccessToken()` lalu ulangi request). **Catatan penting:** endpoint auth-backend **selalu** strict-validate token (tidak ada mode hybrid di sana — beda dari warehouse-backend yang sekarang `AUTH_MODE=hybrid`, lihat catatan Fase 12.1 soal jalur ini belum bisa dites live). Artinya **fase ini adalah kesempatan pertama** memverifikasi jalur refresh-retry `client.ts` benar-benar jalan dengan token yang benar-benar expired/invalid — jangan lewatkan waktu testing.
  - Error message: `AuthApiError extends Error`, jadi `getErrorMessage()` yang sudah ada di [`src/api/errors.ts`](../src/api/errors.ts) **otomatis kompatibel** (jatuh ke cabang `error instanceof Error` → pakai `error.message` mentah dari backend apa adanya). Tidak perlu bikin `ERROR_MESSAGES` baru untuk auth-backend — pesannya sudah cukup manusiawi dikirim langsung.
- Service API tipis di atas client itu, ikut pola `src/api/warehouses.ts` dkk:
  - `src/api/users.ts` — `getMe`, `updateMe`, `changeMyPassword`, `listUsers`, `getUser`, `createUser`, `updateUser`, `sendPasswordReset`, `listUserSessions`, `revokeUserSession`.
  - `src/api/roles.ts` — `listAssignableRoles`.
  - `src/api/businessUnits.ts` — `getBusinessUnit` (buat nampilin info BU sendiri kalau perlu).
- Types baru di `src/types/user.ts` (mirror `AuthUser` yang sudah ada di `authApi.ts` — pertimbangkan re-export dari situ, bukan duplikasi) + `Role`, `Session`, `PaginatedUsers`.

### 13.1 Halaman Profile (`/profile`) — semua role

| Fitur | Endpoint |
|---|---|
| Lihat profil | `GET /users/me` |
| Edit nama/email | `PUT /users/me` |
| Ganti password | `PATCH /users/me/password` |

Detail:
- 2 form terpisah di 1 halaman (Data Diri, Ganti Password) — jangan digabung 1 submit, mengikuti pola
  "1 concern = 1 form" yang sudah dipakai di modul lain (mis. `PaymentFormModal` terpisah dari `InvoiceFormPage`).
- `role`, `bu_name`, `status` ditampilkan **read-only** (bukan input) — endpoint ini mengabaikan field
  itu kalau dikirim, jangan buat UI yang menyiratkan bisa diedit.
- Ganti email ke yang sudah dipakai → `409`, toast pakai `getErrorMessage()` seperti biasa.
- Ganti password: field `current_password` + `new_password`, validasi client-side samakan dengan aturan
  backend (8–72 karakter, ada huruf besar/kecil/angka, beda dari `current_password`) sebelum submit —
  pola sama seperti validasi client-side `PaymentFormModal`/`StockTransferFormPage` (server tetap validator akhir).
- Sukses ganti password → tampilkan pesan bahwa **sesi/device lain** ter-logout otomatis (backend revoke
  semua refresh token lain), tapi tab yang sedang dipakai **tidak** langsung logout paksa (access token
  yang sedang aktif tetap valid sampai expired natural, ≤15 menit — behavior yang disengaja, bukan bug
  kalau tab ini kelihatan "masih login" sesaat setelah ganti password).
- Tambahkan link ke `/profile` dari blok nama/role user di header (`Layout.tsx` baris ~135) — saat ini
  cuma teks statis, jadikan `<Link>` supaya halaman ini gampang dicapai dari mana pun.

### 13.2 Halaman User Management (`/users`) — `super-admin` & `admin-bu`

**Nav & guard** (pola sama dengan Cost/HPP di Fase 12 — sembunyikan total, bukan disable):
- Tambah ke `permissions.ts`: `canManageUsers()` → `role === 'super-admin' || role === 'admin-bu'`.
- Nav item "Users" di `Layout.tsx` cuma dirender kalau `canManageUsers()`.
- Route `/users/*` sendiri juga digate (bukan cuma nav-nya) — role lain yang akses URL langsung harus
  kena halaman 403 di frontend (server juga akan tolak 403 kalau nekat panggil API-nya langsung, tapi
  UI tidak boleh diam-diam menampilkan tabel kosong seperti bug `buildUrl()` di Fase 2 — tampilkan pesan
  akses ditolak yang jelas).

**Fitur & endpoint:**

| Fitur | Endpoint | Catatan |
|---|---|---|
| List user (scoped otomatis: `admin-bu` cuma lihat BU sendiri) | `GET /users?page&per_page&search` | pola sama `DataTable`+`Pagination`+search-debounced seperti `ItemListPage` |
| Detail user | `GET /users/:id` | |
| Tambah user | `POST /users` | **tidak menerima password** — lihat catatan di bawah |
| Edit user | `PUT /users/:id` | `name`, `email`, `role`, `bu_id`, `status` |
| Kirim ulang link set-password | `POST /users/:id/send-password-reset` | |
| Lihat & cabut sesi/device | `GET /users/:id/sessions`, `DELETE /users/:id/sessions/:sessionId` | tabel kecil di panel/modal detail user |
| Role yang boleh di-assign | `GET /roles` | **JANGAN hardcode daftar role di frontend** — backend balikin persis role yang boleh dipilih requester (`admin-bu` tidak akan pernah dapat opsi `super-admin` dari endpoint ini) |
| Info BU sendiri (opsional, buat header halaman) | `GET /business-units/:id` pakai `user.bu_id` sendiri | `admin-bu` cuma boleh lihat BU miliknya sendiri lewat endpoint ini |

**Hal-hal penting yang WAJIB dipahami sebelum implementasi form create/edit:**

1. **Create user tidak menerima/kirim password.** Backend generate password acak internal dan
   mengirim link "set password" ke email user baru. Response sukses **kadang** menyertakan
   `set_password_token` mentah (hanya kalau backend `MAIL_EXPOSE_TOKENS=true`, dev-only) — field ini
   **opsional**, jangan asumsikan selalu ada. Default UI: "Link aktivasi telah dikirim ke email."; kalau
   `set_password_token` ada di response, tampilkan tambahan sebagai link yang bisa di-copy (memudahkan
   testing tanpa perlu cek inbox beneran).
2. **Tidak ada delete/hapus user** — cuma `status: SUSPENDED`. Tombol di UI harus berlabel
   "Nonaktifkan"/"Aktifkan", bukan "Hapus".
3. **Dropdown role WAJIB dari `GET /roles`**, bukan konstanta hardcoded — ini beda dari `permissions.ts`
   (`WRITE_MATRIX` dkk itu untuk gating UI warehouse-backend, resource yang beda total dari "role apa
   yang boleh dibuat"). Field `requires_bu` di tiap item response menentukan apakah field BU wajib
   ditampilkan untuk role yang dipilih (untuk `admin-bu` field BU selalu terkunci ke BU sendiri dan
   disembunyikan dari form; untuk `super-admin` field BU jadi dropdown biasa, wajib kecuali role yang
   dipilih adalah `super-admin`).
4. **Guard anti-lockout ada di backend, bukan tanggung jawab frontend.** Backend menolak (`409`, pesan
   jelas) kalau perubahan role/status/BU bakal bikin sebuah BU kehilangan **semua** `admin-bu` aktifnya
   (termasuk kalau admin-bu coba suspend/demote dirinya sendiri). **Jangan** coba replikasi logic ini di
   client (butuh tahu semua user lain di BU yang sama, mahal & gampang out-of-sync) — cukup tampilkan
   pesan `409` apa adanya lewat `getErrorMessage()`.
5. **Perubahan role/status/`bu_id` = user itu logout paksa dari semua device** (backend revoke semua
   refresh token-nya). Tampilkan sebagai helper text di form edit, mis. "Mengubah role, status, atau BU
   akan mengeluarkan user ini dari semua perangkat yang sedang login."
6. **`admin-bu` boleh membuat/mengedit `admin-bu` lain** di BU yang sama (bukan cuma role operasional) —
   pastikan dropdown role dari `GET /roles` untuk `admin-bu` benar-benar menyertakan opsi `admin-bu`
   (backend sudah begitu; ini cuma pengingat supaya tidak ada asumsi keliru "admin-bu = akses terbatas
   ke role di bawahnya doang" saat baca response).

**Struktur file yang disarankan** (ikut pola `src/features/contacts/`):
```
src/features/users/
  UserListPage.tsx       # list + search + pagination + tombol "+ Tambah User"
  UserFormModal.tsx       # create & edit (mode dibedakan lewat prop, pola sama WarehouseFormModal)
  UserSessionsModal.tsx   # (atau digabung ke UserFormModal sebagai tab) list sesi + tombol cabut
```

### 13.3 Testing checklist (mengikuti pola verifikasi progress-log.md — live di browser, backend nyata)

- [ ] Login tiap role → halaman Profile tampilkan data benar (`bu_name: null` khusus `super-admin`).
- [ ] Edit nama sendiri di Profile → tersimpan, langsung terlihat berubah di header `Layout.tsx`.
- [ ] Ganti email ke yang sudah dipakai user lain → toast `409` muncul, form tidak ke-submit diam-diam.
- [ ] Ganti password: current salah → error jelas; current benar → sukses; login dari browser/tab lain
      dengan refresh token lama → gagal (bukti revoke jalan); tab yang sedang dipakai tetap "kelihatan login"
      sampai access token expired natural (bukan bug).
- [ ] Nav "Users" **tidak muncul sama sekali** untuk `staff-gudang`/`kasir-sales`/`purchasing`/`finance`;
      akses `/users` langsung via URL untuk role itu → halaman 403 di frontend (bukan tabel kosong).
- [ ] Login sebagai `admin-bu` BU tertentu → list Users cuma tampilkan user di BU itu.
- [ ] Buat user baru (role `staff-gudang`) dari `admin-bu` → cek `bu_id` otomatis BU admin itu (field
      terkunci, tidak bisa diubah dari form); kalau `MAIL_EXPOSE_TOKENS=true` di backend dev, copy
      `set_password_token` dan pakai buat aktivasi via halaman reset-password (kalau sudah ada) atau
      lewat `curl`.
- [ ] Dari akun `admin-bu`, buka form Tambah User → dropdown role **tidak ada** opsi `super-admin`.
- [ ] Coba suspend/edit-role `admin-bu` yang merupakan satu-satunya admin aktif di BU-nya → toast `409`
      dengan pesan "last active admin-bu" muncul apa adanya.
- [ ] Buat 2 admin-bu di 1 BU dulu, baru suspend salah satunya → sukses (yang kedua jadi penjaga BU itu).
- [ ] Cabut 1 sesi lewat tombol di `UserSessionsModal` → verifikasi user tersebut ter-logout dari device
      terkait (butuh 2 browser/profile buat verifikasi penuh; minimal verifikasi API call `DELETE` sukses
      + baris sesi hilang/berubah status dari list).
- [ ] `npm run build` + `npm run lint` bersih, 0 error console sepanjang sesi QA (pola wajib tiap fase).
