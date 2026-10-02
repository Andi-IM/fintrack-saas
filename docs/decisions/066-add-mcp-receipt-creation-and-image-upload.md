# ADR-066: Add MCP Receipt Creation and Image Upload Support

## Status

Accepted

## Context

Previously, the FinTrack MCP Server (ADR-063) only provided read-only capabilities for receipts (`list_receipts` and `get_receipt_details`). When users or AI assistants interact via MCP to record transactions backed by receipts (e.g. salary slips, purchase invoices, ATM slips), there was no MCP tool available to upload image proofs or create structured receipt entries directly. Users were forced to either switch to the web/mobile UI for uploads or record unattached text-only cash flow entries without receipt links or storage files.

External AI clients, desktop environments (Claude Desktop, Cursor), and CLI tools need a programmatic, validated way to:
1. Submit new receipts with optional image attachments (via local file path or Base64 payload).
2. Store the image in Supabase Storage (`receipts` bucket) using the user-scoped folder convention (`<user_id>/<store>/<timestamp>-<suffix>.<ext>`) established in ADR-021 and storage policies.
3. Automatically synchronize or link the receipt with a `cash_flow` transaction (as either income or expense) to ensure real-time financial tracking accuracy.
4. Retrieve signed image URLs on-demand for existing receipts.

## Decision

Extend `mcp-server/src/tools/receipts.ts` with two new tools:

1. **`create_receipt`**:
   - Accepts parameters: `store_name`, `total_price`, `date`, `type` (`shopping`, `atm`, `salary`, `other`), `payment_method`, `store_address`, `amount_paid`, `change`, `items`, and user ID overrides.
   - Accepts image attachment via either `file_path` (local file system path) or `image_base64` (Base64 data string with optional `image_filename`).
   - If image input is provided, uploads the image buffer to Supabase Storage bucket `'receipts'` under `<user_id>/<sanitized_store_name>/...` and associates the resulting storage path to the receipt record.
   - Inserts itemized rows into `receipts_items` if `items` are provided.
   - Provides `sync_to_cash_flow` (default `true`) to automatically create an associated `cash_flow` record with `receipt_id` link and appropriate `income`/`expense` amounts.
   - Returns the created receipt, line items, cash flow entry, and a 1-hour signed URL for the uploaded image.

2. **`get_receipt_image_url`**:
   - Accepts `receipt_id` or `file_path`, along with an optional expiration time in seconds (default 3600).
   - Generates and returns a signed Supabase Storage URL allowing AI agents or users to preview the receipt image securely.

## Alternatives Considered

- **Only accepting Base64 in tools**: Rejected because when running in local environments (such as Claude Desktop or local CLI), passing large Base64 strings across stdio consumes unnecessary tokens and memory compared to resolving a local `file_path`. Supporting both `file_path` and `image_base64` provides optimal flexibility for all client environments.
- **Handling image upload exclusively via web UI**: Rejected because the primary goal of the FinTrack MCP Server is to empower agentic and conversational workflows where users instruct the assistant to log transactions along with evidence.

## Consequences

- Positive: Enables conversational agents and MCP clients to create receipts and upload salary slips or shopping receipts directly.
- Positive: Maintains strict user isolation and adheres to Supabase Storage RLS folder conventions.
- Positive: Automatically reflects new receipts in cash flow analytics through atomic cash flow synchronization.
- Trade-off: Local file path reading requires the MCP server process to have filesystem access to the specified path (standard for local stdio MCP processes).

## Related Notes

- [063-dedicated-fintrack-mcp-server.md](file:///d:/01_Projects/fintrack-saas/docs/decisions/063-dedicated-fintrack-mcp-server.md)
- [receipts.ts](file:///d:/01_Projects/fintrack-saas/mcp-server/src/tools/receipts.ts)
- [mcp-server/README.md](file:///d:/01_Projects/fintrack-saas/mcp-server/README.md)
