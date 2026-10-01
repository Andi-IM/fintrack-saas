# ADR-063: Dedicated FinTrack MCP Server

## Status

Accepted

## Context

External services, developer environments (e.g. Cursor, Claude Desktop, Antigravity CLI), and AI agents require programmatic access to FinTrack data and functionalities (such as cash flow records, bank statement mutations, receipts with OCR details, and analytics summaries).

Exposing these capabilities via the Model Context Protocol (MCP) standardizes tooling discovery, parameter validation, and execution across LLM clients without tightly coupling them to the frontend Next.js App Router layer or exposing unprotected direct database connections.

## Decision

Implement a dedicated TypeScript MCP Server in the `mcp-server/` directory using `@modelcontextprotocol/sdk`.

Key architectural choices:
1. **Transport**: Default to standard I/O (`StdioServerTransport`), which is supported natively by Claude Desktop, Cursor, and CLI runners.
2. **Schema Validation**: Utilize `zod` to declare tool input parameters and enforce strict types.
3. **Multi-tenant Security & Data Isolation**:
   - Support authenticating via Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `FINTRACK_USER_ID` / `SUPABASE_ACCESS_TOKEN`).
   - Every operation is scoped to the target user's ID to prevent cross-tenant data leakage.
4. **Tool Catalog**:
   - `list_cash_flow`: Query cash flow transactions with pagination and date/category filters.
   - `create_cash_flow_entry`: Add income or expense records.
   - `get_cash_flow_summary`: Retrieve summarized cash flow totals.
   - `list_bank_statements`: List uploaded bank statements and parsing status.
   - `get_statement_mutations`: Retrieve mutation line items for a given statement.
   - `list_receipts`: List uploaded receipts and merchants.
   - `get_receipt_details`: Retrieve receipt details and itemized products.
   - `get_financial_analytics`: Retrieve financial analytics matching the dashboard ranges.

## Alternatives Considered

- **Embedding MCP route handler inside Next.js API (`app/api/mcp/route.ts`)**: Rejected because most desktop LLM tools (Claude Desktop, Cursor) prefer spawning a local process via stdio, and maintaining a standalone package keeps deployment flexibility high.
- **Direct database access by external agents**: Rejected due to lack of validation, bypass of business logic, and security risks.

## Consequences

- Positive: Seamless, standardized integration for any MCP-compliant client.
- Positive: Independent lifecycle and versioning from the Next.js frontend UI.
- Positive: Clear separation of concerns with strong Zod schema validation.
- Trade-off: Requires maintaining an additional `package.json` and build pipeline within the repository.

## Related Notes

- [fintrack-mcp-server-spec.md](file:///C:/Users/andii/.gemini/antigravity-cli/brain/b4447af6-4fa3-4ad4-94db-4c32a3aa6542/fintrack-mcp-server-spec.md)
- `mcp-server/`
