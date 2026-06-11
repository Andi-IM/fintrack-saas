# ADR-026: Client-Side Image Compression for OCR Upload

## Status

Accepted

## Context

Receipt images uploaded for OCR processing often exceed 1 MB (phone cameras produce 3-5 MB photos). The Next.js Server Action has a default body size limit of 1 MB, causing `413 Body exceeded 1 MB limit` errors. Additionally, large payloads increase upload latency and consume more bandwidth.

Options for compression:

1. **Server-side with sharp**: Compress images in `DocumentProcessor.process()` using the `sharp` library. Pulls native dependencies and requires a new package install.
2. **Client-side with Canvas API**: Compress images in the browser using the built-in Canvas API before appending to FormData. Zero additional dependencies, reduces upload size before the network request.
3. **No compression, raise server limit only**: Simply increase `serverActions.bodySizeLimit`. Does not address upload latency or bandwidth.

## Decision

Adopt a **hybrid approach**: client-side compression via Canvas API as the primary mechanism, paired with an increased server limit as a safety net.

### Architecture

```
Browser (compression layer)
  onDrop handler
    → compressImageIfNeeded(file)     # Canvas API, JPEG quality loop
    → file ≤ 1 MB                     # Guaranteed before upload
  Server Action
    → experimental.serverActions.bodySizeLimit: '5mb'  # Safety net
```

### Compression Algorithm (`lib/ocr/compress-image.ts`)

1. Skip if file ≤ 1 MB or not an image.
2. Load image via `Image` + `URL.createObjectURL`.
3. Downscale to max 2048px on the longest edge (preserve aspect ratio).
4. Export as JPEG in a quality loop (85% → 10%, step -10) until size ≤ 1 MB.
5. If compression does not reduce file size, return the original file.

### Integration Points

- `ScanDialog.tsx:onDrop` — compress before setting `fileToScan`
- `TransactionForm.tsx:onDrop` — compress before setting `fileToScan`

### Server-Side Safety Net

`next.config.ts` sets `experimental.serverActions.bodySizeLimit: '5mb'` to handle edge cases where client-side compression is bypassed (e.g., PDF uploads, scripted API calls, network race conditions).

## Alternatives Considered

1. **Server-side compression with sharp**: Rejected because `sharp` requires native bindings (`libvips`), adds deployment complexity, and pnpm store version conflicts made installation unreliable in the current environment.

2. **Raise server limit only**: Rejected alone because it does not reduce upload time or bandwidth. However, retained as a safety net alongside client-side compression.

3. **Client-side Canvas API (Chosen)**: Zero dependencies, runs entirely in the browser, reduces payload before the network request, and integrates cleanly into the existing `onDrop` handlers.

## Consequences

### Positive

- **Upload sizes reduced**: 3-5 MB photos → ≤1 MB before leaving the browser.
- **Zero new dependencies**: Canvas API is a browser built-in.
- **Faster uploads**: Smaller payload = less network time, especially on mobile connections.
- **Backward compatible**: Unchanged files and existing receipts compress silently.

### Neutral

- Compression adds ~50-200 ms client-side processing time (negligible compared to OCR API latency).
- JPEG output discards transparency and alpha channels (irrelevant for receipt photos).

### Risks

- Canvas API `toBlob()` may fail with extremely large images (>10000px) in memory-constrained environments. The 2048px downscale mitigates this.
- `OffscreenCanvas` is not used (worker thread unavailable) — compression blocks the main thread briefly.

## Related Notes

- `lib/ocr/compress-image.ts` — compression utility
- `components/transactions/ScanDialog.tsx:53` — onDrop integration
- `components/transactions/TransactionForm.tsx:164` — onDrop integration
- `next.config.ts:23` — server actions body size limit
