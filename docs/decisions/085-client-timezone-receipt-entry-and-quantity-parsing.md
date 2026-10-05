# ADR-085: Client-Timezone Receipt Entry Normalization and Robust Quantity Parsing

## Status

Accepted

## Context

An end-to-end receipt workflow (receipt image uploaded via an MCP agent, then reviewed in the web UI) surfaced three defects:

1. **Container-inaccessible image paths**: The MCP server runs inside a Podman/Docker container, while the agent supplied a host filesystem path (`/home/ubuntu/.hermes/cache/images/...`). The container cannot read the host disk, producing `Receipt image file was not found on local disk`. The `image_base64` path already existed (ADR-068), but tool descriptions and the error message did not make the container constraint obvious, so agents kept sending host paths.

2. **Wall-clock time misinterpreted as UTC on input**: A receipt showing `17:07 WIB` was stored as `2026-10-05T10:07:00+00:00` (correct UTC) when the client offset was supplied, but MCP `resolveReceiptTime` (ADR-069) parsed offset-less strings such as `"2026-10-05T17:07:00"` using the **server process timezone**. Inside a container (`TZ=UTC`) this stored `17:07` as UTC instead of `10:07` UTC — a 7-hour error. The frontend already renders stored `TIMESTAMPTZ` in the browser's local timezone (ADR-009), so the database correctly stores UTC; the defect was purely in how inputs without an explicit offset were anchored.

3. **Quantity parsing dropped/misread items**: In `ShoppingReceiptParser.parseFormatA` (ADR-024), the pattern `NAME PRICE × QTY` only matched when a unit price preceded the multiplier. Real receipts use `DAY BUTTERCOTCH 226R × 5 pcs` followed by the amount on the next line, and `HARNELI RISOLES KOTAK × 1` — these were missed (or the model number `226R` was confused with a quantity), so items were silently dropped and quantities defaulted to 1.

## Decision

### 1. Explicit timezone anchoring for MCP timestamps

- Add a `timezone_offset` parameter (`±HH:MM`, validated by regex) to MCP `create_receipt` and `update_receipt`, defaulting to `+07:00` (WIB).
- In `resolveReceiptTime`, detect whether the incoming value already carries an explicit timezone (`Z` or `±HH:MM`). If not, append `timezone_offset` before parsing, so the wall-clock time is anchored to the client timezone regardless of the server/container timezone.
- When only a date (`YYYY-MM-DD`) is supplied, derive the current wall-clock time in the client timezone (best-effort fixed-offset → IANA mapping for WIB/WITA/WIT/UTC) before anchoring, preserving the existing "don't truncate to midnight" behaviour.
- Storage remains UTC (`TIMESTAMPTZ`); display continues to convert to the client timezone via `new Date(iso)` (ADR-009). No schema change.

### 2. Container-aware image upload guidance

- Clarify tool descriptions for `file_path`, `local_file_path`, and `image_base64`, marking `image_base64` as preferred for containerized/remote agents.
- Detect host-style paths (`/...` or `C:\...`) in the not-found error and emit an actionable hint (copy/mount the file, or use `image_base64`).

### 3. Robust quantity parsing

- Extend `ShoppingReceiptParser.parseFormatA` to support an optional trailing unit after the multiplier and a `NAME × QTY` form whose total amount lives on the next line. Quantity is taken from after the multiplier; the model code (e.g. `226R`) is not treated as a quantity.

## Alternatives Considered

- **Store a separate timezone column**: Rejected. `TIMESTAMPTZ` already records an absolute instant correctly; adding a display-only offset duplicates information and complicates queries. Client-side rendering already produces correct local times.
- **Require explicit offsets only (reject offset-less input)**: Rejected as too strict — agents frequently emit `datetime-local`-style strings. Appending a default client offset is more forgiving while still correct.
- **Force agents to mount the host cache directory into the container**: Rejected as the sole fix; mounting is environment-specific and brittle. `image_base64` is portable and already supported.
- **Fix parsing at the OCR/AI layer only**: Rejected — deterministic regex handling for well-known receipt formats is cheaper and more reliable than re-prompting a model.

## Consequences

### Positive

- Receipt times entered by agents are anchored to the client timezone and stored correctly as UTC, independent of the container's clock timezone.
- Clearer guidance reduces the recurring "file not found" failure for MCP image uploads.
- Multi-quantity shopping receipts (e.g. `× 5 pcs`) now parse with correct quantity, unit price, and subtotal.
- No database migration required.

### Trade-offs / Risks

- The default `+07:00` assumes Indonesian clients unless `timezone_offset` is supplied; other clients must pass their own offset for correct anchoring.
- `parseFormatA` heuristics remain receipt-format-specific; new formats may still require additional branches.
- The `NAME × QTY` branch assumes the total amount is on the following line; receipts placing it elsewhere fall through to other parsers.

## Related Notes

- MCP receipts tool: `mcp-server/src/tools/receipts.ts`
- Shopping parser: `frontend/lib/ocr/receipts/shopping-parser.ts`
- Tests: `frontend/features/receipts/__tests__/shopping-parser.test.ts`
- Previous ADRs: [009](009-standardize-date-format-and-timezone.md), [024](024-abstract-receipt-parser-strategy-pattern.md), [066](066-add-mcp-receipt-creation-and-image-upload.md), [068](068-mcp-server-reliability-and-statement-import.md), [069](069-cash-flow-time-precision-and-mcp-tooling.md)
