# Test Case Document: CashFlowListx

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-FCF-001 | renders transactions successfully on desktop view | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-002 | renders categorized tags correctly | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-003 | toggles mobile drawer on card tap | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-004 | triggers search filter changes | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-005 | calls router.push when edit button is clicked on desktop | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-006 | calls handleClearDateFilter when date filter button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-007 | calls handleResetFilters when Bersihkan Filter button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-008 | calls handleSearchChange("") when search clear button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-009 | calls filter handlers on select change | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-010 | calls page handlers when page size and page buttons are clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-011 | handles mobile drawer actions correctly | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-012 | handles desktop delete transaction click | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-013 | renders ellipse placeholder in pagination when page number is "..." | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-014 | renders correctly when transaction has no description | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-015 | handles mobile drawer rendering for income transaction | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FCF-016 | does not call handleDelete if window.confirm returns false in mobile drawer | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
