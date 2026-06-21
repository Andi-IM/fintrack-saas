# ADR-034: Auth & Data Layer Decoupling Strategy

## Status
Accepted

## Context
Codebase saat ini memiliki tight coupling yang masif ke Next.js runtime (`redirect`, `revalidatePath`, `headers`, `cookies`) dan Supabase server client. Lebih dari 80 coupling points di 30+ file. Hanya `lib/repositories/cash_flow.ts` yang sudah di-abstraksi via Repository Pattern + DI (`getCashFlowRepository()` / `setCashFlowRepository()`). 

File `lib/actions/auth.ts`, `lib/actions/receipts.ts`, dan `lib/actions/statements.ts` masih memanggil `createClient()` langsung — total 29 kali tanpa abstraksi. Akibatnya:
- Unit test server actions tidak mungkin tanpa mem mock module-level `next/cache`, `next/headers`, `@/lib/supabase/server`
- Tiap file action butuh inline mock sendiri
- Tidak ada cara injeksi dependency untuk melanjutkan test scenarios

Solusi yang diadopsi adalah memperluas Repository Pattern yang sudah ada ke domain `receipts` dan `statements`, menambahkan wrapper untuk framework primitives, dan memindahkan `redirect()` dari dalam action ke return type.

## Decision

### 1. Jangkan `AppServerClient` (supabase factory) dari action
Buat interface `ReceiptRepository` dan `StatementRepository` di `lib/repositories/`, dengan implementasi `SupabaseReceiptsRepository` dan `SupabaseStatementsRepository` yang memanggil `createClient()` di dalamnya. Gunakan pola `getXxxRepository()` / `setXxxRepository()` yang sama seperti `CashFlowRepository`.

### 2. Ganti semua `createClient()` di action files
- `lib/actions/receipts.ts` → injeksi `getReceiptRepository()`
- `lib/actions/statements.ts` → injeksi `getStatementRepository()`
- `lib/actions/auth.ts` → injeksi `getAuthRepository()` (supabase auth + OAuth)

### 3. Wraper `revalidatePath()` → `invalidateCache()`
Buat `lib/cache.ts` dengan `invalidateCache(paths: string[])` yang memanggil `revalidatePath` untuk setiap path. Action files mengimpor wrapper ini, bukan `next/cache` langsung. Di test, mock `lib/cache.ts` sekali di `vitest.setup.ts`.

### 4. Auth: return `NavigationResult` bukan `redirect()` langsung
Ganti `redirect()` di dalam `login()` dan `logout()` dengan return type:
```ts
type NavigationResult = { kind: 'redirect'; to: string } | { kind: 'revalidate'; paths: string[] }
```
Komponen yang memanggil action akan menangani navigasi. Ini membuat auth logic bisa ditest tanpa Next.js runtime.

### 5. Global test mocks di `vitest.setup.ts`
Tambahkan mock untuk:
- `next/cache` → `revalidatePath = vi.fn()`
- `next/headers` → `headers = vi.fn()` / `cookies = vi.fn()`
- `next/navigation` → `redirect = vi.fn()` (sudah ada untuk client hooks, perlu ditambah untuk server)
- `@/lib/supabase/server` → `createClient = vi.fn()` return mock supabase
- `next/link` → `<Link>` sebagai `<a>` untuk component test

### 6. OCR aman, tetap apa adanya
`lib/actions/ocr.ts` tidak punya coupling ke Next.js atau Supabase — tinggal biarkan.

## Alternatives Considered

| Alternatif | Alasan Ditolak |
|---|---|
| Mock `next/cache`, `next/headers`, `@/lib/supabase/server` per file | Repetitif, tidak scalable, setiap file baru harus ulang mock |
| Pindah seluruh logic ke client components | Bertentangan dengan arsitektur RSC yang sudah ada |
| Gunakan dependency injection container (tsyringe, inversify) | Over-engineering untuk ukuran project ini — factory pattern + setter sudah cukup |
| Abaikan, biarkan tight | Tidak bisa tulis unit test untuk actions tanpa mocking Next.js runtime di setiap file |

## Consequences

### Positive
- **80+ coupling points** berkurang menjadi ~15 (infrastructure files: middleware, supabase factory, root layout)
- Unit test semua 4 action files menjadi mungkin tanpa Next.js runtime
- `cash_flow` sudah testable; `receipts`, `statements`, `auth` segera bisa ditest
- Pola repository + DI sudah terbukti di `cash_flow.ts` — konsisten mengembangkannya

### Trade-offs
- Menambah 6 file baru di `lib/repositories/` dan `lib/cache.ts`
- `redirect()` diganti return type — komponen panggil perlu menangani `NavigationResult`. Ini adalah **breaking change** pada contract action → component.
- Supabase `from('...')` dan `.insert()` / `.update()` / `.delete()` masih ada di dalam repository, tapi itulah tujuan Repository Pattern — isolate persistence concern.

### Risks
- Jika ada komponen lain di luar yang sudah diketahui memanggil action, perlu dicek ulang untuk handle `NavigationResult`
- `lib/actions/auth.ts` menggunakan `signInWithOAuth` yang return `{ data: { url } }` — mapping ke `NavigationResult` perlu hati-hati agar flow OAuth tetap jalan

## Related Notes

- Referensi pola yang sudah ada: `lib/repositories/cash_flow.ts`
- Test yang sudah ada: `lib/actions/__tests__/cash_flow.test.ts`
-.file `docs/decisions/` baru dibuat untuk menampung ADR

