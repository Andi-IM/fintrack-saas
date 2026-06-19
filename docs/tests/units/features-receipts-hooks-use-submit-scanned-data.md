# Test Case Document: useSubmitScannedData Hook

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-USSD-001 | Tidak melakukan apa-apa jika tidak ada fileToScan atau scanResult yang diset | 1. Mock fileToScan = null<br>2. Render hook<br>3. Panggil handleSaveScannedItems | fileToScan: null | - saveReceipt TIDAK dipanggil | Sesuai ekspektasi | Lulus |
| TC-USSD-002 | Submit Receipt berhasil | 1. Mock saveReceipt return success<br>2. Render hook<br>3. Panggil handleSaveScannedItems | valid receipt data | - saveReceipt dipanggil<br>- resetScan dipanggil<br>- push ke '/' | Sesuai ekspektasi | Lulus |
| TC-USSD-003 | Menangani kegagalan save Receipt | 1. Mock saveReceipt return {success:false, error:...}<br>2. Render hook<br>3. Panggil handleSaveScannedItems | saveReceipt failure | - saveReceipt dipanggil<br>- setScanStatus ke 'error'<br>- setErrorMessage dengan pesan error | Sesuai ekspektasi | Lulus |
| TC-USSD-004 | Submit BankStatement berhasil | 1. Mock saveBankStatement return success<br>2. Render hook<br>3. Panggil handleSaveScannedItems | valid bank statement data | - saveBankStatement dipanggil<br>- resetScan dipanggil<br>- push ke '/' | Sesuai ekspektasi | Lulus |
| TC-USSD-005 | Menangani kegagalan save BankStatement | 1. Mock saveBankStatement return {success:false, error:...}<br>2. Render hook<br>3. Panggil handleSaveScannedItems | saveBankStatement failure | - saveBankStatement dipanggil<br>- setScanStatus ke 'error'<br>- setErrorMessage dengan pesan error | Sesuai ekspektasi | Lulus |
| TC-USSD-006 | Menangani exception tak terduga selama save | 1. Mock saveReceipt throw Error<br>2. Render hook<br>3. Panggil handleSaveScannedItems | saveReceipt throws | - setScanStatus ke 'error'<br>- setErrorMessage dengan pesan error | Sesuai ekspektasi | Lulus |
