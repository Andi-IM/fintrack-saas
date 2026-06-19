# Test Case Document: Date Utils

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-DU-001 | formatDateForInput memformat ISO string valid ke format datetime-local | 1. Panggil formatDateForInput dengan ISO string | input: '2026-06-19T10:30:00Z' | - Mengembalikan string dengan format ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$ | Sesuai ekspektasi | Lulus |
| TC-DU-002 | formatDateForInput mengembalikan string asli ketika input bukan date valid | 1. Panggil formatDateForInput dengan string bukan date | input: 'not-a-date' | - Mengembalikan 'not-a-date' | Sesuai ekspektasi | Lulus |
| TC-DU-003 | formatDateForInput mengembalikan string asli untuk string kosong | 1. Panggil formatDateForInput dengan '' | input: '' | - Mengembalikan '' | Sesuai ekspektasi | Lulus |
| TC-DU-004 | formatDateForInput menambahkan padding pada bulan, hari, jam, menit yang single-digit | 1. Panggil formatDateForInput dengan tanggal 2026-01-05T09:03:00Z | input: '2026-01-05T09:03:00Z' | - Mengembalikan string dengan 01-05T09:03 | Sesuai ekspektasi | Lulus |
| TC-DU-005 | getBrowserTimezoneOffset mengembalikan format +HH:MM untuk offset negatif (ahead of UTC) | 1. Mock getTimezoneOffset mengembalikan -420 (UTC+7)<br>2. Panggil getBrowserTimezoneOffset() | offset: -420 | - Mengembalikan '+07:00' | Sesuai ekspektasi | Lulus |
| TC-DU-006 | getBrowserTimezoneOffset mengembalikan format -HH:MM untuk offset positif (behind UTC) | 1. Mock getTimezoneOffset mengembalikan 300 (UTC-5)<br>2. Panggil getBrowserTimezoneOffset() | offset: 300 | - Mengembalikan '-05:00' | Sesuai ekspektasi | Lulus |
| TC-DU-007 | getBrowserTimezoneOffset menambahkan padding pada jam dan menit yang single-digit | 1. Mock getTimezoneOffset mengembalikan 61 (1h 1m behind UTC)<br>2. Panggil getBrowserTimezoneOffset() | offset: 61 | - Mengembalikan '-01:01' | Sesuai ekspektasi | Lulus |
