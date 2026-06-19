# Test Case Document: scan-mapper Utilities

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-SM-001 | isReceiptItem mengembalikan true untuk ReceiptItem dan false untuk BankTransaction | 1. Panggil isReceiptItem dengan receiptItem dan bankItem | ReceiptItem dan BankTransaction | - isReceiptItem(receiptItem) = true<br>- isReceiptItem(bankItem) = false | Sesuai ekspektasi | Lulus |
| TC-SM-002 | isBankTransaction mengembalikan true untuk BankTransaction dan false untuk ReceiptItem | 1. Panggil isBankTransaction dengan receiptItem dan bankItem | ReceiptItem dan BankTransaction | - isBankTransaction(receiptItem) = false<br>- isBankTransaction(bankItem) = true | Sesuai ekspektasi | Lulus |
| TC-SM-003 | mapReceiptResultToPayload memetakan OCRResult ke SaveReceiptInput dengan benar dengan nilai default | 1. Panggil mapReceiptResultToPayload dengan scanResult dan file | scanResult dengan merchant, total, items | - storeName = 'Test Store'<br>- totalPrice = 15000<br>- items memiliki length 1 dan benar<br>- file = fakeFile | Sesuai ekspektasi | Lulus |
| TC-SM-004 | mapReceiptResultToPayload menggunakan nilai fallback ketika field opsional hilang | 1. Panggil mapReceiptResultToPayload dengan scanResult kosong dan file | empty scanResult | - storeName = 'Unknown Merchant'<br>- totalPrice = 0<br>- paymentMethod = 'Cash'<br>- items = [] | Sesuai ekspektasi | Lulus |
| TC-SM-005 | mapBankStatementResultToPayload memetakan OCRResult ke SaveBankStatementInput dengan benar dengan nilai default | 1. Panggil mapBankStatementResultToPayload dengan scanResult dan file | scanResult dengan bank, statementPeriod, openingBalance, closingBalance, items | - bankName, statementPeriod, openingBalance, closingBalance sesuai<br>- items sesuai<br>- file = fakeFile | Sesuai ekspektasi | Lulus |
| TC-SM-006 | mapBankStatementResultToPayload menggunakan nilai fallback untuk bank statement | 1. Panggil mapBankStatementResultToPayload dengan scanResult kosong dan file | empty scanResult | - bankName = 'Unknown Bank'<br>- statementPeriod = 'Unknown Period'<br>- items = [] | Sesuai ekspektasi | Lulus |
