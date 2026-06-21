# Test Case Document: ScanDialogx

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-FRC-001 | renders correctly in Receipt mode when idle | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-002 | renders correctly in BankStatement mode when idle | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-003 | shows file ready to scan when file is selected | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-004 | shows scanning progress | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-005 | shows error state and allows retry | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-006 | shows success state and allows editing for Receipt | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-007 | triggers handleProcessScan correctly | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-008 | triggers handleSaveScannedItems for Receipt | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-009 | triggers handleSaveScannedItems for BankStatement | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-010 | allows adding and deleting items in Receipt mode | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-011 | renders BankStatement success state and allows editing fields | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-012 | handles drop/select file correctly | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-013 | rejects PDF file larger than 1MB | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-014 | compresses non-PDF file larger than 1MB | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-015 | calls setFileToScan(null) when Remove button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-016 | has accessible dropzone for file upload | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-017 | has accessible dropzone for bank statement upload | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-018 | returns null when scanStatus is not scanning or error | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-019 | has role status and aria-live for scanning state | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FRC-020 | has role alert for error state | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
