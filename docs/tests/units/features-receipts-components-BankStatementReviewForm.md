# Test Case Document: BankStatementReviewFormx

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-FRC-001 | returns null if scanResult is null | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-002 | renders correctly when scanResult.items is undefined | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-003 | renders and allows editing of bank statement fields and transactions | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-004 | calls resetScan when Discard button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-005 | calls handleSaveScannedItems when Confirm & Save button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-006 | renders when scanResult.items is an empty array | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-007 | renders scanResult.items with non-bank transaction items | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-008 | handles null/undefined values for optional fields | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
