# Test Case Document: useOcrScanner Hook

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-UOS-001 | Tidak melakukan apa-apa jika tidak ada fileToScan yang diset | 1. Mock useScanStore dengan fileToScan = null<br>2. Render hook useOcrScanner<br>3. Panggil handleProcessScan | fileToScan: null | - setScanStatus TIDAK dipanggil | Sesuai ekspektasi | Lulus |
| TC-UOS-002 | Menjalankan handleProcessScan berhasil dan menganimasikan progress | 1. Mock scanDocumentWithAI dengan promise yang ditunda<br>2. Mock setScanProgress untuk melacak<br>3. Render hook useOcrScanner<br>4. Panggil handleProcessScan<br>5. Fast-forward waktu beberapa kali<br>6. Resolve scan promise | fileToScan: valid, scanPromise with resolve | - setScanStatus dipanggil dengan 'scanning'<br>- scanDocumentWithAI dipanggil<br>- progress mencapai 90 kemudian 100<br>- setScanResult dipanggil<br>- setScanStatus dipanggil dengan 'success' | Sesuai ekspektasi | Lulus |
| TC-UOS-003 | Menangani kegagalan scan | 1. Mock scanDocumentWithAI mengembalikan { success: false, error: ... }<br>2. Render hook useOcrScanner<br>3. Panggil handleProcessScan | scan failure response | - setScanStatus dipanggil dengan 'error'<br>- setErrorMessage dipanggil dengan error message | Sesuai ekspektasi | Lulus |
| TC-UOS-004 | Menangani exception dalam proses scanning | 1. Mock scanDocumentWithAI melempar Error<br>2. Render hook useOcrScanner<br>3. Panggil handleProcessScan | Error: Network error | - setScanStatus dipanggil dengan 'error'<br>- setErrorMessage dipanggil dengan error message | Sesuai ekspektasi | Lulus |
