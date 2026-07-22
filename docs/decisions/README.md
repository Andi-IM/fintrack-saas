# Architecture Decision Records (ADRs)

Dokumentasi ini berisi daftar catatan keputusan arsitektural (ADR) untuk proyek FinTrack SaaS. 
Setiap keputusan desain yang signifikan dan berpengaruh besar terhadap struktur atau alur proyek didokumentasikan di sini untuk memudahkan penelusuran sejarah pengembangan.

## Daftar ADR

- [ADR-001](001-intermediate-review-bank-statement.md) - Implementation of Intermediate Review Table for Bank Statement Extraction
- [ADR-002](002-multi-item-receipt.md) - Recording Cash Payment Details and Receipt Line Items Structure
- [ADR-003](003-integrate-supabase.md) - Supabase Integration as Primary Database Backend
- [ADR-004](004-ux-ui-redesign-strategy.md) - UX/UI Optimization and Redesign Strategy
- [ADR-005](005-refactor-nextjs-app-router-best-practices.md) - Refactor to Next.js App Router Best Practices
- [ADR-006](006-github-oauth-with-email-whitelist.md) - GitHub OAuth Integration and Email Whitelist Restriction
- [ADR-007](007-google-cloud-vision-ocr-without-gemini.md) - Use Google Cloud Vision OCR with Local Parsing
- [ADR-008](008-adopt-strategy-pattern-for-ocr-and-parsing.md) - Adopt Strategy Pattern for OCR and Parsing
- [ADR-009](009-standardize-date-format-and-timezone.md) - Standardize Date Format and Timezone for OCR Parsing
- [ADR-010](010-support-bni-bank-statement-parsing.md) - Support BNI Bank Statement Parsing
- [ADR-011](011-support-new-bni-mutation-format.md) - Support New BNI Mutation Format
- [ADR-012](012-move-nextjs-to-frontend.md) - Move Next.js Frontend to front-end Directory
- [ADR-013](013-document-reader-service.md) - Introduce Modal-based docTR OCR Service (document-reader-service)
- [ADR-014](014-ocr-service-authentication.md) - Authenticating docTR OCR Service Endpoints
- [ADR-015](015-integrate-doctr-ocr-frontend.md) - Integrating docTR OCR Service with Next.js Frontend
- [ADR-016](016-route-jago-statement-to-doctr.md) - Routing Bank Jago Statements specifically to docTR OCR Service
- [ADR-017](017-standardize-state-management-architecture.md) - Standardize State Management Architecture
- [ADR-018](018-standardize-server-action-response-pattern.md) - Standardize Server Action Response Pattern with Discriminated Unions
- [ADR-019](019-bank-statement-analytics.md) - Bank Statement Financial Analytics
- [ADR-020](020-partition-consolidated-bank-jago-statements.md) - Partition Consolidated Bank Jago Statements by Month in Database
- [ADR-021](021-add-receipts-and-items-schema.md) - Introduce Receipts and Receipt Items Schema
- [ADR-022](022-store-ocr-detected-receipt-data.md) - Store OCR-Detected Receipt Data in Receipts and Receipts Items Tables
- [ADR-023](023-add-atm-receipts-support.md) - Support ATM Receipts in Receipts Table
- [ADR-024](024-abstract-receipt-parser-strategy-pattern.md) - Abstract Receipt Parser Using Strategy Pattern
- [ADR-025](025-edit-receipts-functionality.md) - Edit Scanned Receipts Functionality
- [ADR-026](026-client-side-image-compression.md) - Client-Side Image Compression for OCR Upload
- [ADR-027](027-mina-swlayan-parser-ocr-misread-handling.md) - Mina Swalayan Parser — OCR Misread Handling and Merchant Normalization
- [ADR-028](028-add-reference-number-to-receipts.md) - Add Reference Number to Receipts to Link to Bank Statement Items
- [ADR-029](029-sync-bank-statement-items-to-cash-flow.md) - Sync Bank Statement Items to Cash Flow via Database Triggers
- [ADR-030](030-adopt-vitest-and-react-testing-library-for-frontend-testing.md) - Adopt Vitest and React Testing Library for Frontend Testing
- [ADR-031](031-implement-semantic-release.md) - Implement Semantic Release for Automated Versioning and Release Management
- [ADR-032](032-enforce-high-coverage-on-critical-pathways.md) - Enforce High Test Coverage on Critical Pathways to Prevent Critical Regressions
- [ADR-033](033-migrate-to-feature-based-architecture.md) - Migrate Frontend to Feature-Based Architecture
- [ADR-034](034-auth-datalayer-decoupling.md) - Auth & Data Layer Decoupling Strategy
- [ADR-035](035-bank-statement-list-hook-view-separation.md) - Separate BankStatementList into Hook + View for Testability
- [ADR-036](036-decouple-scan-dialog.md) - Decouple ScanDialog into Sub-components and Hooks for Testability
- [ADR-037](037-fix-balance-persistence-and-ui-bugs.md) - Fix Balance Persistence and UI Bugs from PR #3 Review
- [ADR-038](038-integrate-lighthouse-ci-for-performance-testing.md) - Integrate Lighthouse CI for Performance Testing
- [ADR-039](039-accessibility-a11y-implementation-for-receipts.md) - Accessibility (a11y) Implementation for Receipts and Scan Components
- [ADR-040](040-robust-e2e-testing-strategies.md) - Robust E2E Testing Strategies and Stateful Fakes
- [ADR-041](041-file-system-mock-db-for-e2e.md) - File-System Persistence for E2E Fake Repositories
- [ADR-042](042-fake-authentication-for-e2e.md) - Fake Authentication Strategy for Local E2E Testing
- [ADR-043](043-server-action-redirect-preservation.md) - Server Action Error Handling and Redirect Preservation Pattern
- [ADR-044](044-build-time-e2e-fakes-and-dynamic-wait.md) - Build-Time Environment Injection for E2E Fakes and Dynamic Wait Strategies
- [ADR-045](045-instant-navigation-with-suspense-and-loading-states.md) - Instant Navigation with Suspense and Streaming (loading.tsx)
- [ADR-046](046-lazy-load-heavy-charts-for-tbt-optimization.md) - Lazy Load Heavy Charts for TBT Optimization
- [ADR-047](047-standardize-frontend-testing-repository-pattern.md) - Standardize Frontend Testing Repository Pattern
- [ADR-048](048-fully-gemini-based-receipt-parsing-and-vision-only.md) - Fully Gemini-Based Receipt Parsing and Google AI Vision Only
- [ADR-049](049-local-email-password-authentication.md) - Local Email & Password Authentication Support

- [ADR-050](050-migrate-to-openai-compatible-parser-via-groq.md) - Migrate to OpenAI Compatible Parser via Groq
- [ADR-051](051-decouple-login-page-from-supabase-client.md) - Decouple Login Page from Supabase Client
- [ADR-052](052-production-rls-implementation.md) - Production Row Level Security Implementation
- [ADR-053](053-server-side-filtering.md) - Server-Side Data Filtering and Pagination
- [ADR-054](054-ocr-fallback-mechanism.md) - Orchestrator Fallback Mechanism for Bank Statement OCR
- [ADR-055](055-modal-doctr-as-primary-ocr-extractor.md) - Use Modal docTR as the Primary OCR Extractor
- [ADR-056](056-convert-bank-statement-period-to-date.md) - Convert Bank Statement Period to Date
- [ADR-057](057-enable-coderabbit-pr-review.md) - Enable CodeRabbit Pull Request Review
- [ADR-058](058-bank-statement-ai-reparse.md) - Bank Statement AI Reparse from OCR Text
- [ADR-059](059-add-mistral-fallback-for-openai-compatible-parser.md) - Add Mistral Fallback for OpenAI-Compatible OCR Parsing
