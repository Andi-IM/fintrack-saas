# Test Case Document: BankStatementReviewForm Component

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-BSRF-001 | Menyimpan data bank statement yang dipindai | 1. Render komponen dengan scanResult valid<br>2. Klik tombol "Confirm & Save | scanResult valid | Fungsi handleSaveScannedItems dipanggil | Sesuai ekspektasi | Lulus |
| TC-BSRF-002 | Merender ketika scanResult.items adalah array kosong | 1. Siapkan scanResult dengan items array kosong<br>2. Render komponen | scanResult.items: [] | Komponen tetap merender dengan benar | Sesuai ekspektasi | Lulus |
| TC-BSRF-003 | Merender scanResult.items dengan item yang bukan transaksi bank | 1. Siapkan scanResult dengan items campuran (beberapa bukan transaksi bank dan beberapa bukan<br>2. Render komponen | items: [{ name: 'Non-bank item', amount: 50000 }, { name: 'Salary', amount: 5000000, type: 'income', date: '2026-06-19T10:00:00Z' }] | - Item yang bukan transaksi bank TIDAK ditampilkan<br>- Item transaksi bank ditampilkan | Sesuai ekspektasi | Lulus |
| TC-BSRF-004 | Menangani nilai null/undefined untuk field opsional | 1. Siapkan scanResult dengan field statementPeriod, openingBalance, closingBalance null/undefined<br>2. Render komponen | scanResult: { bank: 'BCA', statementPeriod: undefined, openingBalance: null, closingBalance: undefined, items: [] } | - Input untuk openingBalance dan closingBalance memiliki nilai 0<br>- Komponen tetap merender dengan benar | Sesuai ekspektasi | Lulus |
