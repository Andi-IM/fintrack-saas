# Test Case Document: Auth Actions

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-AUTH-001 | login me-resolve origin menggunakan DefaultOriginResolver jika tidak ada resolver yang diberikan | 1. Panggil `login()` tanpa argumen<br>2. Verifikasi panggilan ke auth service | Mock auth service | - fakeAuthService.login dipanggil dengan origin dari DefaultOriginResolver | Sesuai ekspektasi | Lulus |
| TC-AUTH-002 | login me-resolve origin menggunakan resolver kustom yang diberikan | 1. Buat resolver kustom<br>2. Panggil `login(mockResolver)`<br>3. Verifikasi panggilan | Mock custom resolver | - fakeAuthService.login dipanggil dengan origin dari custom resolver | Sesuai ekspektasi | Lulus |
| TC-AUTH-003 | login fallback ke DefaultOriginResolver ketika FormData diberikan (signature lama) | 1. Buat FormData dummy<br>2. Panggil `login(formData)`<br>3. Verifikasi panggilan | Dummy FormData | - fakeAuthService.login dipanggil dengan origin dari DefaultOriginResolver | Sesuai ekspektasi | Lulus |
| TC-AUTH-004 | logout memanggil authService.logout | 1. Panggil `logout()`<br>2. Verifikasi panggilan ke auth service | Mock auth service | - fakeAuthService.logout dipanggil 1x | Sesuai ekspektasi | Lulus |
