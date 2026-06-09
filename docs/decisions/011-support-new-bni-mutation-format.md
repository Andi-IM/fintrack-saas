# ADR-011: Support New BNI Mutation Format

## Status

Accepted

## Context

BNI has introduced a new digital "Laporan Mutasi Rekening" statement format. This format is structurally distinct from the older BNI layouts parsed by the system:
1. It uses header labels such as `"Laporan Mutasi Rekening"` and `"Tanggal & Waktu"`.
2. The Date and Time are represented in a unified column format (e.g. `31 Jan 2025 \n 23:59:59 WIB`).
3. It uses explicit sign indicators in the nominal column (e.g. `-5,000` for expenses and `+` or unsigned values for income) rather than separate columns or `D`/`K` suffixes.
4. When processed via OCR (such as OCR.space), the text is returned in non-contiguous column blocks rather than aligned rows.

To support this new statement layout without breaking existing parser functionality, we need a dedicated parser routine that can detect and parse this format.

## Decision

Extend `BniParser` to check for the new BNI format and route parsing to a new private routine `parseNewBniFormat`.

Key implementation details:
1. **Detection**: Match keywords `"Laporan Mutasi Rekening"` or `"Tanggal & Waktu"`.
2. **Date-Time Parsing**: Extract all transaction dates matching `^\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{2,4}$` and pair them with subsequent times matching `^\d{2}:\d{2}(?::\d{2})?(\s+WIB)?$`.
3. **Description Parsing**: Extract lines between the table's `Saldo Awal` and `Saldo Akhir`. Group multi-line descriptions dynamically by identifying transaction start keywords (e.g., `biaya`, `transfer`, `setor`, `tarik`, `qris`).
4. **Nominal Parsing**: Extract signed numeric lines (matching `/^[+-]\s*[\d,.]+$/`) that appear after the table's `Nominal (IDR)` or `Saldo (IDR)` header.
5. **Alignment**: Align the dates, descriptions, and nominals by their index to construct correct `BankTransaction` objects.

## Alternatives Considered

1. **Integrating into generic table parser**: Rejected because the OCR representation contains separate column blocks instead of tabular row output, which causes standard row-by-row table parsers to fail.
2. **Merging with old BNI Vision layout parser**: Rejected because the old parser relies heavily on the `D`/`K` direction suffix and heuristic amount mapping which does not apply to the signed values of the new layout. Bypassing or patching the old logic would lead to high code complexity and regression risks.

## Consequences

### Positive
- **Compatibility**: The parser successfully supports both the new BNI format and legacy BNI formats.
- **Accuracy**: Resolves complex layouts correctly with proper transaction categorization, dates, and amounts.
- **Maintainability**: Clear division of layout-specific parsing paths within `BniParser`.
