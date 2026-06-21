# Test Case Document: BankStatementListViewx

## Test Cases

| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |
|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|
| TC-FBS-001 | renders loading spinner | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-002 | renders empty state | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-003 | renders bank group and period row | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-004 | calls toggleBank when bank header is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-005 | calls togglePeriod when period row is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-006 | calls handleDeleteStatement when delete button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-007 | calls handleViewFile when View PDF button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-008 | shows loading spinner on delete button when deleteMutation is pending for that statement | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-009 | does not disable delete button when a different statement is pending | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-010 | renders balance summary and item table when period is expanded | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-011 | renders income icon for income items | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-012 | renders expense icon for expense items | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-013 | shows "-" in balance column when item has null balance | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-014 | shows Loader2 spinner on delete item button when deleteItemMutation is pending | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-015 | does not disable delete item button when a different item is pending | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-016 | calls setEditingItem when edit button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-017 | calls handleDeleteItem when item delete button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-018 | calls setAddingToStatement when desktop Add Item button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-019 | calls setActiveMobileItem when mobile card is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-020 | renders edit dialog when editingItem is set | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-021 | calls setEditingItem(null) when edit dialog is closed | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-022 | passes undefined balance to edit dialog when item balance is null | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-023 | calls updateItemMutation.mutateAsync when edit dialog save is triggered | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-024 | renders add dialog when addingToStatement is set | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-025 | calls addItemMutation.mutateAsync when add dialog save is triggered | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-026 | calls setAddingToStatement(null) when add dialog is closed | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-027 | calls setAddingToStatement when mobile Add Item button is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-028 | renders mobile drawer when activeMobileItem is set | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-029 | shows "Tanpa Deskripsi" when activeMobileItem item has no description | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-030 | calls setEditingItem and clears activeMobileItem when Edit Item is clicked in drawer | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-031 | calls setActiveMobileItem(null) when Batal is clicked | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-032 | calls setActiveMobileItem(null) when dialog onOpenChange is triggered (e.g. via Escape) | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-033 | calls deleteItemMutation.mutateAsync and clears drawer when Hapus Item is confirmed | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-034 | does not call mutateAsync when Hapus Item confirm is cancelled | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
| TC-FBS-035 | shows "-" for category in drawer when item has no category | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |
