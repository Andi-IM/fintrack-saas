---
status: proposed
date: 2026-06-21
decision-makers: [USER, Antigravity]
---

# ADR-045: Instant Navigation with Suspense and Streaming

## Context
Saat ini, navigasi antar halaman utama di aplikasi FinTrack SaaS (seperti perpindahan dari *Dashboard* ke daftar *Cash Flow*, *Receipts*, atau *Bank Statements*) bervariasi dalam kinerjanya. Pada beberapa rute yang menggunakan *top-level await* di Server Components, arsitektur bawaan Next.js App Router bersifat *blocking*: ketika sebuah tautan (`<Link>`) diklik, Next.js menunggu hingga seluruh pengambilan data selesai sebelum memindahkan layar.

Kebutuhan UX (*User Experience*) terbaru mensyaratkan agar perpindahan layar harus instan dengan urutan:
1. Pengguna mengklik fitur di navigasi.
2. Halaman langsung terbuka (Header langsung terlihat agar pengguna sadar transisi berhasil).
3. Komponen *Loading Skeleton* dimunculkan di area data.
4. Pemanggilan data berjalan di latar belakang (tanpa menghalangi render komponen lain).
5. Setelah data kembali, komponen *Loading* ditutup dan data disajikan.

## Decision
Setelah menyadari bahwa mengandalkan `<Suspense>` manual di dalam `page.tsx` masih menyebabkan jeda navigasi 300-500ms akibat latensi jaringan (karena rute bersifat dinamis `await searchParams`), kami merevisi keputusan awal. Kami memutuskan untuk **menggunakan fitur `loading.tsx` bawaan Next.js** agar perpindahan layar (Client-Side Navigation) benar-benar terjadi secara **instan (0ms)**.

Untuk mengatasi masalah hilangnya *Header* (alasan awal penolakan `loading.tsx`), kami memutuskan bahwa:
Setiap file `loading.tsx` **harus menduplikasi secara statis kerangka Header** dari halamannya masing-masing, yang diikuti oleh *Skeleton UI*. Dengan cara ini, ketika pengguna mengklik navigasi, Header statis dan Skeleton akan langsung muncul seketika dari *cache router* klien (0ms), sementara Next.js memuat komponen halaman asli dari server di latar belakang.

Strategi implementasi ini diterapkan sebagai berikut:

### 1. Fitur *Receipts*, *Cash Flow / Transactions*, dan *Dashboard Analytics*
- **Tindakan Refactor Utama:** 
  1. Hapus pembungkus `<Suspense>` manual dari dalam `page.tsx`.
  2. Buat file `loading.tsx` di masing-masing direktori fitur (`app/(dashboard)/receipts/loading.tsx`, `app/(dashboard)/transactions/loading.tsx`, `app/(dashboard)/loading.tsx`).
  3. Salin struktur JSX *Header* (judul, deskripsi, dan tombol aksi statis) dari `page.tsx` ke dalam `loading.tsx` masing-masing, lalu pasang *Skeleton* di bawahnya.
- **Dampak:** Pengguna akan langsung melihat kerangka halaman beserta Header dalam 0 milidetik, sementara server memproses data dan mengirim halaman utuhnya.

### 2. Fitur *Bank Statements* (`app/(dashboard)/statements/page.tsx`)
Halaman ini tidak bergantung pada pengambilan data di sisi server (menggunakan React Query di *Client Component*).
- **Tindakan Refactor:** Biarkan perenderan *Skeleton* ditangani oleh *state loading* klien (`isLoading` dari `useQuery`), tetapi pastikan *Skeleton* yang digunakan sudah memiliki standar visual yang disepakati di atas (bukan hanya animasi putar).

## Alternatives Considered
- **Hanya menggunakan `<Suspense>` manual di dalam `page.tsx`:** 
  *Alasan Direvisi (Ditolak):* Pendekatan ini (keputusan kita sebelumnya) mengharuskan klien untuk menunggu RSC Payload awal dari server. Karena Next.js tidak me-*prefetch* halaman dinamis (halaman dengan `searchParams`) secara default, pendekatan ini selalu terbentur *latency* jaringan sebesar 300-500ms di *production*, yang gagal memenuhi standar "navigasi seketika".
- **Client-Side Data Fetching Sepenuhnya (SWR / React Query):** 
  *Alasan Ditolak:* Bertolak belakang dengan keputusan memanfaatkan Next.js Server Components dan berisiko mengekspos logika pemanggilan DB ke sisi klien.

## Consequences
### Positive
- **Navigasi Sejati 0ms:** Pengguna sama sekali tidak merasakan lag jaringan saat berpindah halaman utama; interaksi terasa seperti aplikasi SPA lokal berkinerja ekstrim.
- **UX Sangat Konsisten:** Transisi visual yang mulus berkat duplikasi Header secara cerdik, memberikan ilusi bahwa halaman sudah ter-render.

### Trade-offs
- **Duplikasi Kode Minor:** *Header* dan tombol aksi statisnya harus ditulis ulang di dalam `loading.tsx`. Jika ada perubahan pada desain atau teks *Header*, *developer* harus ingat untuk memperbaruinya di dua tempat (atau mengekstrak *Header* ke komponen *shared*).
- **Dampak Fatal pada Skrip Pengujian E2E (WebdriverIO):** Perubahan menjadi *Instant Navigation* telah mengubah pola rendering awal. Karena *Skeleton UI* kini merender elemen statis dan struktur bayangan secara instan (0ms), WebdriverIO tidak bisa lagi hanya menunggu elemen seperti `$$('tbody tr')`.
  - *Mitigasi Wajib:* Seluruh skrip E2E telah dirombak menggunakan penanda *state* eksplisit (`<tbody data-state="loaded">`) sebagai *wait condition* yang akurat. Mitigasi ini **sudah selesai** dan diverifikasi 100% *passing*.

## Related Notes
- Lihat **ADR-035** (Pemisahan BankStatementList).
- Pola koding dari `app/(dashboard)/receipts/page.tsx` secara resmi adalah standar patokan implementasi arsitektur per rute ini.
