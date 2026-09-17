# Bug Report: `bu_id` Tidak Sinkron Antara Auth-Backend & Warehouse-Backend

**Dilaporkan dari sesi kerja frontend, 2026-09-06.** Ditemukan tidak sengaja saat mencoba
live-test fitur cetak PDF (invoice & surat jalan) — bukan bug di frontend, tapi ketahuan dari sana.

---

## Ringkasan

Auth-backend dan warehouse-backend **masing-masing punya kolom/klaim `bu_id`** buat merepresentasikan
Business Unit yang sama (`BU-C` / "Business Unit C"), tapi nilainya **beda angka** di kedua sistem
sekarang:

| Sistem | Sumber | `bu_id` untuk BU-C |
|---|---|---|
| **auth-backend** | Klaim `bu_id` di JWT access token milik `admin.buc@test.local` (role `admin-bu`, `bu_name: "Business Unit C"`) | **15** |
| **warehouse-backend** | Kolom `bu_id` di tabel `warehouses` untuk `WH-C-PUSAT` (id 2) & `WH-C-CABANG` (id 3) | **13** |

Karena warehouse-backend nge-filter data berdasarkan `req.userContext.buId` (dari token) yang harus
match `warehouses.bu_id`, dan angkanya beda (15 ≠ 13), **`admin.buc` sekarang tidak bisa lihat
warehouse-nya sendiri sama sekali** — baik lewat list (`GET /api/warehouses` balikin `total: 0`)
maupun akses langsung by-id (`GET /api/inbounds/1` balikin `403 FORBIDDEN`,
`"warehouse 1 is outside your business unit"`).

**Ini bukan masalah kecil** — user dengan role `admin-bu`/`staff-gudang`/`kasir-sales` di BU-C
(minimal `admin.buc@test.local`, kemungkinan juga `staff.buc@test.local` & `kasir.buc@test.local`
kalau satu BU yang sama) efektifnya **tidak bisa pakai aplikasi sama sekali** — dashboard kosong,
tidak bisa pilih warehouse di form manapun, tidak bisa buat transaksi baru.

---

## Bukti (raw response, dicek 2026-09-06)

**1. Warehouse-backend, unscoped (tanpa token) — data warehouse asli:**
```
GET /api/warehouses
{
  "data": [
    { "id": 1, "code": "WH-PUSAT",    "bu_id": 14, ... },
    { "id": 2, "code": "WH-C-PUSAT",  "bu_id": 13, ... },
    { "id": 3, "code": "WH-C-CABANG", "bu_id": 13, "parent_warehouse_id": 2, ... }
  ]
}
```

**2. Auth-backend — token `admin.buc@test.local` (password `Admin12345`):**
```json
POST /auth/login → decoded JWT payload:
{ "user_id": 32, "role": "admin-bu", "bu_id": 15, ... }
```
Response login juga eksplisit bilang `"bu_name": "Business Unit C"` untuk `bu_id: 15` ini.

**3. Warehouse-backend, DENGAN token `admin.buc` di atas:**
```
GET /api/warehouses  → { "data": [], "meta": { "total": 0 } }
GET /api/inbounds/1  → 403 { "error": { "code": "FORBIDDEN",
                              "message": "warehouse 1 is outside your business unit" } }
```

---

## Kapan mulai rusak?

Ini **bukan bug lama** — dulu pernah kerja normal. Di sesi QA sebelumnya (dicatat di
`docs/progress-log.md`, Fase 12.1, tanggal 2026-08-30), `admin.buc` juga sudah `bu_id: 15`, dan
BU-scoping-nya **lolos penuh** waktu itu (dites 2 arah, `admin.pusat` vs `admin.buc`, keduanya
cuma lihat warehouse BU sendiri). Artinya waktu itu warehouse-backend juga masih punya
`WH-C-PUSAT`/`WH-C-CABANG` dengan `bu_id: 15` yang **match** dengan token.

Kesimpulan: **antara 2026-08-30 dan 2026-09-06, `warehouses.bu_id` di warehouse-backend berubah
dari 15 → 13** (kemungkinan besar karena `warehouse_db` di-reset ulang — lihat catatan di
`frontend-integration-guide.md` §13 yang bilang BU-C "belum punya script reset" dan "dibuat manual
lewat panggilan API satu-satu" — kalau proses manual itu diulang atau warehouse_db kena
`reset-warehouse-db.sql` lagi, nomor `bu_id` yang dipakai saat re-create warehouse BU-C bisa beda
dari nomor asli di auth-backend, apalagi kalau tidak ada cara programatic buat warehouse-backend
"nanya balik" ke auth-backend "BU-C itu id berapa sekarang?" sebelum insert).

---

## Yang perlu diperbaiki

**Pilih salah satu (bukan dua-duanya, cukup buat konsisten):**

- **Opsi A — perbaiki di warehouse-backend:** `UPDATE warehouses SET bu_id = 15 WHERE id IN (2, 3)`
  (menyesuaikan ke auth-backend, yang kelihatannya tidak berubah dari Fase 12.1).
- **Opsi B — perbaiki di auth-backend:** update `business_units` row BU-C (dan user-user yang
  terasosiasi: `admin.buc`, `staff.buc`, `kasir.buc`, dst) supaya `bu_id`-nya jadi **13**,
  menyesuaikan ke warehouse-backend.

Saya condong ke **Opsi A** (angka di auth-backend yang dipertahankan) karena itu yang terbukti
konsisten sejak awal (2026-08-30) — kemungkinan besar warehouse-backend-lah yang baru berubah.
Tapi keputusan akhir sebaiknya dicek dulu ke migration/seed history masing-masing backend buat
pastikan mana yang benar-benar "asli".

**Rekomendasi tambahan (pencegahan jangka panjang):** kedua backend ini nyimpen `bu_id` sebagai
angka mentah tanpa foreign-key constraint lintas-database (memang tidak bisa, beda DB) — jadi
tidak ada validasi otomatis kalau salah satu sisi berubah sendirian. Pertimbangkan salah satu:
1. Warehouse-backend validasi `bu_id` yang masuk (saat create/update warehouse) dengan **panggil
   auth-backend** buat konfirmasi BU itu beneran ada, bukan cuma terima angka mentah.
2. Atau, minimal: dokumentasikan proses reset/reseed supaya SELALU jalan berurutan (auth-backend
   dulu → catat `bu_id` yang ke-generate → baru seed warehouse-backend pakai angka itu), bukan
   dikerjakan independen di 2 waktu berbeda seperti yang kelihatannya terjadi di sini.

---

## Temuan terpisah (bukan bu_id, tapi ditemukan barengan)

Beberapa akun test dari dokumentasi lama **sudah tidak bisa login sama sekali**
(`"Invalid email or password"`, bukan soal `bu_id`):
- `superadmin@test.local`
- `admin.pusat@test.local`
- `staff.pusat@test.local`

Kemungkinan password-nya ikut ter-reset atau akunnya kehapus pas `auth_db` di-reset. Kalau
memang sengaja diganti, tolong update daftar kredensial test yang terbaru — dokumentasi
`frontend-integration-guide.md` §13 sudah tidak akurat lagi buat akun-akun ini.

---

## Status — sisi auth-backend (diperbaiki 2026-09-06)

**Root cause ketemu:** bukan `warehouse_db` di-reset. Penyebabnya `scripts/seed-testers.mjs`
di repo **auth-backend** (versi lama) yang ikut menulis ke `warehouse_db` — tiap dijalankan
(dan itu disuruh dijalankan tiap kali password tester "hilang") dia meng-`UPDATE warehouses SET bu_id`
pakai heuristik ngawur: "warehouse index ke-0 → CABANG, sisanya → PUSAT". Itu yang bikin
`WH-PUSAT` jadi `bu_id 14` dan `WH-C-*` jadi `bu_id 13`, bukan reset warehouse_db.

**Yang sudah dikerjakan di auth-backend:**
1. `scripts/seed-testers.mjs` **ditulis ulang** — sekarang **cuma menyentuh `auth_db`**, tidak
   pernah lagi menulis ke `warehouse_db`. Isinya diselaraskan persis dengan §13
   (BU: `PUSAT` + `BU-C` saja, 9 user, password **`Admin12345`**). "CABANG" dihapus (itu invented
   sama script lama, bukan bagian §13). Script mencetak map `code → id` BU tiap dijalankan.
2. **Data `warehouse_db` sudah dikoreksi manual** (undo kerusakan script lama):
   `WH-PUSAT → bu_id 13` (PUSAT), `WH-C-PUSAT` & `WH-C-CABANG → bu_id 15` (BU-C).
   Dites end-to-end: `admin.buc` sekarang lihat 2 warehouse BU-C, `admin.pusat` lihat 1 warehouse PUSAT,
   isolasi lintas-BU pulih.
3. **Akun `superadmin@test.local` / `admin.pusat` / `staff.pusat` bisa login lagi** — password
   di-reset ke `Admin12345` oleh script baru. §13 masih akurat (password memang `Admin12345`);
   yang salah adalah script lama yang meng-overwrite ke `Tester123`.
4. **Pencegahan:** auth-backend expose `GET /business-units?code=<CODE>` (+ `?status=`) yang bisa
   dipanggil warehouse-backend lewat header `X-Service-Key` (env `SERVICE_API_KEY`, sama di dua
   backend). Warehouse-backend tidak perlu user token untuk resolve id BU dari code.

**Yang masih perlu dikerjakan di warehouse-backend (bukan tugas auth-backend / frontend):**
- `scripts/seed-baseline.sql` masih hardcode `bu_id: 13` — ganti jadi resolve lewat
  `GET /business-units?code=PUSAT` (atau minimal beri komentar "cek ulang ke auth tiap reseed").
- Bikin script reset/seed untuk BU-C juga (§13 bilang "belum punya script reset") — pakai
  `code` (`BU-C`), bukan angka.
- `POST/PUT /api/warehouses`: validasi `bu_id` yang masuk dengan panggil auth-backend
  (`GET /business-units/:id` + `X-Service-Key`) — tolak kalau BU tidak ada / `INACTIVE`.

**Aturan besar buat ke depan:** `business_units.id` itu auto-increment dan **geser** tiap `auth_db`
di-reseed. Jangan pernah hardcode angka `bu_id` di sisi warehouse — selalu resolve dari `code`.

---

## Status — sisi warehouse-backend (diperbaiki 2026-09-06)

Ketiga item di "Yang masih perlu dikerjakan di warehouse-backend" di atas sudah dikerjakan:

1. **Validasi `bu_id` saat create/update warehouse** — `POST`/`PUT /api/warehouses` sekarang
   manggil auth-backend (`GET /business-units/:id` + header `X-Service-Key`) sebelum nyimpen
   `bu_id` apa pun. `bu_id` yang tidak ada atau BU-nya `INACTIVE` → ditolak `400
   INVALID_BUSINESS_UNIT`. Kalau auth-backend mati/unreachable → `502
   BUSINESS_UNIT_SERVICE_UNAVAILABLE` (fail-closed — request ditolak, bukan diam-diam lolos
   tanpa validasi). File baru: `src/shared/auth/business-units-client.js`.
2. **`scripts/seed-baseline.sql` dihapus**, diganti `scripts/seed-baseline.mjs` — resolve `bu_id`
   dari `code` `"PUSAT"` ke auth-backend di **setiap run**, tidak pernah hardcode angka lagi.
3. **`scripts/seed-bu-c.mjs` (baru)** — pola sama, resolve dari `code` `"BU-C"`, bikin warehouse
   utama + cabang.

**Diverifikasi live** (bukan cuma unit test) terhadap auth-backend & warehouse-backend yang
benar-benar jalan: `bu_id` tidak ada → `400`; `bu_id` `INACTIVE` (`TESTBU1`, id 18) → `400`;
`bu_id` valid & `ACTIVE` → `201`; auth-backend dimatikan di tengah request → `502`; kedua script
seed resolve BU dengan benar (`PUSAT` → `13`, `BU-C` → `15`, cocok persis dengan data live
sekarang — konfirmasi independen bahwa perbaikan manual auth-backend di atas memang sudah
konsisten). 12 unit test baru ditambahkan (`tests/shared/business-units-client.test.js` +
wiring test di `tests/modules/warehouses.service.test.js`) — total suite **167/167 lolos**.

Detail lengkap ada di `docs/warehouse-hierarchy.md` dan `docs/frontend-integration-guide.md` §13
di repo warehouse-backend (bukan repo ini).
