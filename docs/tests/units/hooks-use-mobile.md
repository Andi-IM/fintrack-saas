# Test Case Document: useIsMobile Hook

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-UM-001 | Mengembalikan false ketika lebar jendela lebih besar dari breakpoint | 1. Set window.innerWidth ke 1024<br>2. Render hook useIsMobile | window.innerWidth: 1024 | - result.current = false | Sesuai ekspektasi | Lulus |
| TC-UM-002 | Mengembalikan true ketika lebar jendela lebih kecil dari breakpoint | 1. Set window.innerWidth ke 500<br>2. Render hook useIsMobile | window.innerWidth: 500 | - result.current = true | Sesuai ekspektasi | Lulus |
| TC-UM-003 | Memperbarui state ketika event media query change terpicu | 1. Set window.innerWidth ke 1024<br>2. Render hook useIsMobile<br>3. Ubah innerWidth ke 320<br>4. Panggil changeCallback | innerWidth changes from 1024 to 320 | - Sebelum change: result.current = false<br>- Setelah change: result.current = true | Sesuai ekspektasi | Lulus |
