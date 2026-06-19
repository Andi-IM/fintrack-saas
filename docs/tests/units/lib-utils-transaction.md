# Test Case Document: Transaction Utilities

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-TU-001 | formatCurrency memformat angka ke representasi mata uang IDR | 1. Panggil formatCurrency(25000) dan formatCurrency(10000000) | numbers: 25000, 10000000 | - Hasilnya cocok dengan /Rp\s*25\.000/ dan /Rp\s*10\.000\.000/ | Sesuai ekspektasi | Lulus |
| TC-TU-002 | filterTransactionsByRange memfilter dengan benar untuk range ALL | 1. Panggil filterTransactionsByRange dengan transactions array dan 'ALL' | transactions array with ALL range | - Hasilnya memiliki length 5 | Sesuai ekspektasi | Lulus |
| TC-TU-003 | filterTransactionsByRange memfilter dengan benar untuk range 1W | 1. Panggil filterTransactionsByRange dengan transactions array dan '1W' | transactions array with 1W range | - Hasilnya memiliki length 1 dan id 'tx-2' | Sesuai ekspektasi | Lulus |
| TC-TU-004 | filterTransactionsByRange memfilter dengan benar untuk range 1M | 1. Panggil filterTransactionsByRange dengan transactions array dan '1M' | transactions array with 1M range | - Hasilnya memiliki length 2 dan contains tx-2 dan tx-15 | Sesuai ekspektasi | Lulus |
| TC-TU-005 | filterTransactionsByRange memfilter dengan benar untuk range 3M | 1. Panggil filterTransactionsByRange dengan transactions array dan '3M' | transactions array with 3M range | - Hasilnya memiliki length 3 | Sesuai ekspektasi | Lulus |
| TC-TU-006 | filterTransactionsByRange memfilter dengan benar untuk range 1Y | 1. Panggil filterTransactionsByRange dengan transactions array dan '1Y' | transactions array with 1Y range | - Hasilnya memiliki length 4 | Sesuai ekspektasi | Lulus |
