# Test Case Document: OCR Server Actions

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-OCR-001 | scanDocumentWithAI mengembalikan error ketika tidak ada file yang diberikan | 1. Buat FormData kosong<br>2. Panggil scanDocumentWithAI(formData) | empty FormData | - success = false, error = 'No valid file provided' | Sesuai ekspektasi | Lulus |
| TC-OCR-002 | scanDocumentWithAI mengembalikan error ketika file adalah string bukan File/Blob | 1. Buat FormData dengan file berisi string<br>2. Panggil scanDocumentWithAI(formData) | FormData with string as file | - success = false, error = 'No valid file provided' | Sesuai ekspektasi | Lulus |
| TC-OCR-003 | scanDocumentWithAI mengembalikan field errors ketika validasi gagal | 1. Buat FormData dengan file dan context invalid<br>2. Panggil scanDocumentWithAI(formData) | FormData with invalid context | - success = false, error = 'Invalid input'<br>- fieldErrors.context terdefinisi | Sesuai ekspektasi | Lulus |
| TC-OCR-004 | scanDocumentWithAI mengembalikan success ketika processing mengembalikan hasil valid | 1. Buat FormData dengan file, context Receipt, timezoneOffset<br>2. Mock documentProcessor.process return mockResult<br>3. Panggil scanDocumentWithAI(formData) | valid FormData + mock process result | - success = true, data = mockResult<br>- documentProcessor.process dipanggil dengan Blob, 'Receipt', '420' | Sesuai ekspektasi | Lulus |
| TC-OCR-005 | scanDocumentWithAI mengembalikan error empty result ketika process mengembalikan null/undefined | 1. Buat FormData dengan file dan context BankStatement<br>2. Mock documentProcessor.process return null<br>3. Panggil scanDocumentWithAI(formData) | FormData + process returns null | - success = false, error = 'AI returned an empty result.' | Sesuai ekspektasi | Lulus |
| TC-OCR-006 | scanDocumentWithAI mengembalikan pesan error ketika processor throw error | 1. Buat FormData dengan file dan context Receipt<br>2. Mock documentProcessor.process throw Error('OCR engine offline')<br>3. Panggil scanDocumentWithAI(formData) | FormData + process throws | - success = false, error = 'OCR engine offline' | Sesuai ekspektasi | Lulus |
