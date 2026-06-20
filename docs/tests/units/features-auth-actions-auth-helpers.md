# Test Case Document: Auth Helpers

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-AH-001 | DefaultOriginResolver mengembalikan APP_URL ketika spesifik | 1. Set process.env.APP_URL = 'https://custom-app.com'<br>2. Buat DefaultOriginResolver<br>3. Panggil resolve() | APP_URL env | - Mengembalikan 'https://custom-app.com' | Sesuai ekspektasi | Lulus |
| TC-AH-002 | DefaultOriginResolver mengembalikan VERCEL_URL jika APP_URL tidak ada | 1. Set NEXT_PUBLIC_VERCEL_URL = 'my-vercel-deployment.vercel.app'<br>2. Buat DefaultOriginResolver<br>3. Panggil resolve() | VERCEL_URL env | - Mengembalikan 'https://my-vercel-deployment.vercel.app' | Sesuai ekspektasi | Lulus |
| TC-AH-003 | DefaultOriginResolver fallback ke x-forwarded-host header jika tidak ada env | 1. Mock header x-forwarded-host = 'proxy-host.com'<br>2. Panggil resolve() | header x-forwarded-host | - Mengembalikan 'https://proxy-host.com' | Sesuai ekspektasi | Lulus |
| TC-AH-004 | DefaultOriginResolver fallback ke host header | 1. Mock header host = 'my-host.com' dan proto = 'http'<br>2. Panggil resolve() | header host | - Mengembalikan 'http://my-host.com' | Sesuai ekspektasi | Lulus |
| TC-AH-005 | DefaultOriginResolver fallback ke localhost:3000 jika tidak ada host headers | 1. Mock headers untuk mengembalikan null<br>2. Panggil resolve() | empty headers | - Mengembalikan 'http://localhost:3000' | Sesuai ekspektasi | Lulus |
| TC-AH-006 | DefaultOriginResolver menggunakan https jika host adalah remote dan proto kosong | 1. Mock header host = 'production-site.com'<br>2. Panggil resolve() | remote host header | - Mengembalikan 'https://production-site.com' | Sesuai ekspektasi | Lulus |
| TC-AH-007 | resolveAuthOrigin menginstansiasi resolver dan resolve sukses | 1. Set APP_URL env<br>2. Panggil resolveAuthOrigin() | APP_URL env | - Mengembalikan URL yang sesuai dari resolver | Sesuai ekspektasi | Lulus |
