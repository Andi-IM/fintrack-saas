# FinTrack SaaS E2E Testing

Direktori ini berisi seluruh infrastruktur pengujian *End-to-End* (E2E) dan *Performance Testing* untuk aplikasi FinTrack SaaS. Kami menggunakan **WebdriverIO** (dengan Mocha) untuk pengujian E2E dan **Lighthouse CI** untuk pengujian performa.

## 📂 Struktur Direktori

- `test/specs/`: Berisi skenario tes E2E utama.
  - `auth.e2e.js`: Tes simulasi proses login/logout.
  - `bank-statements.e2e.js`: Tes alur pengunggahan, ekstraksi, dan manajemen *bank statements*.
  - `cash-flow.e2e.js`: Tes fitur pencatatan dan pengelolaan arus kas manual.
  - `receipts.e2e.js`: Tes fitur pemindaian, pengeditan, dan penyimpanan struk belanja.
- `scripts/`: Berisi *script* pembantu eksekusi tes (seperti `run-alternated-tests.js`).
- `wdio.conf.js`: Konfigurasi utama WebdriverIO, di mana integrasi server Next.js dan *mocking environment* diatur.

## 🛠️ Cara Menjalankan Tes

Pastikan Anda berada di direktori `frontend/e2e` dan telah menjalankan `pnpm install`, kemudian gunakan *script* berikut:

| Perintah | Deskripsi |
| --- | --- |
| `pnpm run test` | Menjalankan seluruh *suite* E2E WebdriverIO secara berurutan. |
| `pnpm run test:perf` | Menjalankan *Lighthouse CI* untuk audit performa (Desktop). |
| `pnpm run test:perf:mobile` | Menjalankan *Lighthouse CI* dengan metrik *Mobile*. |
| `pnpm run test:alternated` | Menjalankan *script* custom untuk tes selang-seling (jika diperlukan untuk manajemen *state* khusus). |

## 🧠 Arsitektur & Isolasi Pengujian

Proyek ini mendesain *testing environment* yang **sepenuhnya terisolasi** dari internet (Supabase), membuat tes berjalan super cepat dan terhindar dari *flaky network errors*.

1. **Auth Bypass:** 
   E2E tidak mencoba memanggil Github OAuth sungguhan. WebdriverIO secara otomatis menyuntikkan *dummy cookie* (`fintrack_fake_session`) saat inisialisasi, dan backend otomatis menganggap *user* sebagai *Mock User* berkat *environment variable* `BYPASS_AUTH='true'`.
2. **File-System Mock Database (`.e2e-db.json`):** 
   Setiap kali sebelum sebuah *test suite* berjalan, `wdio.conf.js` akan membersihkan dan me-reset file `../.e2e-db.json` dengan data bawaan. UI berinteraksi murni ke file ini menggunakan `FakeRepository` milik Repository Pattern, berkat kondisi `NEXT_PUBLIC_IS_TESTING='true'`.

> **Catatan:** Jika Anda ingin melakukan integrasi dengan *environment* API sungguhan secara *end-to-end*, Anda dapat menyesuaikan flag `BYPASS_AUTH` dan `NEXT_PUBLIC_IS_TESTING` pada file `.env.ci`.
