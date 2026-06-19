# Test Case Document: useScanStore Hook

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-USS-001 | Inisialisasi dengan nilai default | 1. Ambil state dari useScanStore | initial state | - fileToScan = null<br>- scanStatus = 'idle'<br>- scanProgress = 0<br>- scanResult = null<br>- errorMessage = null | Sesuai ekspektasi | Lulus |
| TC-USS-002 | Menetapkan fileToScan | 1. Buat file baru<br>2. Panggil setFileToScan(file) | file object | - fileToScan = file | Sesuai ekspektasi | Lulus |
| TC-USS-003 | Menetapkan scanStatus | 1. Panggil setScanStatus('scanning') | status 'scanning' | - scanStatus = 'scanning' | Sesuai ekspektasi | Lulus |
| TC-USS-004 | Menetapkan scanProgress dengan nilai dan fungsi updater | 1. Panggil setScanProgress(50)<br>2. Panggil setScanProgress(prev => prev + 10) | numeric and function updater | - Pertama: scanProgress = 50<br>- Kedua: scanProgress = 60 | Sesuai ekspektasi | Lulus |
| TC-USS-005 | Menetapkan scanResult dengan nilai dan fungsi updater | 1. Panggil setScanResult(mockResult)<br>2. Panggil setScanResult dengan fungsi updater | mockResult and function | - Pertama: scanResult = mockResult<br>- Kedua: scanResult.storeName = 'Updated' | Sesuai ekspektasi | Lulus |
| TC-USS-006 | Menetapkan errorMessage | 1. Panggil setErrorMessage('Failed to read document') | error string | - errorMessage = pesan error | Sesuai ekspektasi | Lulus |
| TC-USS-007 | Mereset scan store | 1. Set beberapa state<br>2. Panggil resetScan() | various states set | - Semua state kembali ke default | Sesuai ekspektasi | Lulus |
| TC-USS-008 | Memperbarui field item scan result | 1. Set initialResult dengan items<br>2. Panggil updateScanResultItem(0, 'name', 'Red Apples') | item index 0, field name | - items[0].name = 'Red Apples' | Sesuai ekspektasi | Lulus |
| TC-USS-009 | Mengembalikan empty object jika tidak ada scanResult ketika memperbarui items | 1. Reset scan store<br>2. Panggil updateScanResultItem | no scanResult | - scanResult tetap null | Sesuai ekspektasi | Lulus |
| TC-USS-010 | Menghapus item scan result | 1. Set initialResult dengan items<br>2. Panggil deleteScanResultItem(0) | index 0 | - items.length = 1 dan item pertama adalah 'Bananas' | Sesuai ekspektasi | Lulus |
| TC-USS-011 | Mengembalikan empty object jika tidak ada scanResult ketika menghapus items | 1. Reset scan store<br>2. Panggil deleteScanResultItem | no scanResult | - scanResult tetap null | Sesuai ekspektasi | Lulus |
| TC-USS-012 | Menambah item scan result | 1. Set initialResult dengan items<br>2. Panggil addScanResultItem() | no args | - items.length = 3 dan item baru sesuai default | Sesuai ekspektasi | Lulus |
| TC-USS-013 | Mengembalikan empty object jika tidak ada scanResult ketika menambah items | 1. Reset scan store<br>2. Panggil addScanResultItem() | no scanResult | - scanResult tetap null | Sesuai ekspektasi | Lulus |
| TC-USS-014 | Memperbarui field scan result umum | 1. Set initialResult<br>2. Panggil updateScanResultField('storeName', 'Supermarket') | field storeName | - scanResult.storeName = 'Supermarket' | Sesuai ekspektasi | Lulus |
| TC-USS-015 | Mengembalikan empty object jika tidak ada scanResult ketika memperbarui field umum | 1. Reset scan store<br>2. Panggil updateScanResultField | no scanResult | - scanResult tetap null | Sesuai ekspektasi | Lulus |
