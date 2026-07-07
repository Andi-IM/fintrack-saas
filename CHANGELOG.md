## [1.9.1-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.9.1-rc.1...v1.9.1-rc.2) (2026-07-07)


### Bug Fixes

* **receipts:** handle edge cases for receipt file extensions ([b91ab10](https://github.com/Andi-IM/fintrack-saas/commit/b91ab1098b04e7b98bc56d4636e71c7db93e8440))

## [1.9.1-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.9.0...v1.9.1-rc.1) (2026-07-07)


### Bug Fixes

* align receipt uploads with storage rls ([86dd0cc](https://github.com/Andi-IM/fintrack-saas/commit/86dd0cc8f0d549a7f695b87a7124cdf7d620b860))

# [1.9.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.8.0...v1.9.0) (2026-06-27)


### Bug Fixes

* **auth:** enforce strict type safety for getCachedUser return type ([5465760](https://github.com/Andi-IM/fintrack-saas/commit/54657600997720c83f9e4f9ac9f82173d68ed18e))
* **auth:** prevent header spoofing bypass in supabase middleware ([53451de](https://github.com/Andi-IM/fintrack-saas/commit/53451dea7ee693850bb1dae17d7d120573626e62))
* implement Supabase session middleware with authentication and authorization guards ([fc9ac2a](https://github.com/Andi-IM/fintrack-saas/commit/fc9ac2a3d9826a81b2563f8e61984e30809a0855))


### Features

* implement core frontend infrastructure, layout components, and bank statement processing features ([3e2ad9d](https://github.com/Andi-IM/fintrack-saas/commit/3e2ad9d6122e0c0155bb3fb66c50842f314be134))
* implement dashboard page with interactive transaction trend chart ([d67dd6b](https://github.com/Andi-IM/fintrack-saas/commit/d67dd6bef6711591c78cc0f68856bae8a887bad2))

# [1.9.0-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.9.0-rc.1...v1.9.0-rc.2) (2026-06-27)


### Bug Fixes

* **auth:** enforce strict type safety for getCachedUser return type ([5465760](https://github.com/Andi-IM/fintrack-saas/commit/54657600997720c83f9e4f9ac9f82173d68ed18e))
* **auth:** prevent header spoofing bypass in supabase middleware ([53451de](https://github.com/Andi-IM/fintrack-saas/commit/53451dea7ee693850bb1dae17d7d120573626e62))
* implement Supabase session middleware with authentication and authorization guards ([fc9ac2a](https://github.com/Andi-IM/fintrack-saas/commit/fc9ac2a3d9826a81b2563f8e61984e30809a0855))

# [1.9.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.8.0...v1.9.0-rc.1) (2026-06-27)


### Features

* implement core frontend infrastructure, layout components, and bank statement processing features ([3e2ad9d](https://github.com/Andi-IM/fintrack-saas/commit/3e2ad9d6122e0c0155bb3fb66c50842f314be134))
* implement dashboard page with interactive transaction trend chart ([d67dd6b](https://github.com/Andi-IM/fintrack-saas/commit/d67dd6bef6711591c78cc0f68856bae8a887bad2))

# [1.8.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.7.0...v1.8.0) (2026-06-26)


### Features

* implement cash flow dashboard features including data controllers, list components, and related test suites ([bdf9a23](https://github.com/Andi-IM/fintrack-saas/commit/bdf9a23b9ed652ef4f6c940dec5b01948a037719))
* implement multi-tenant row-level security across all tables and private storage buckets with optimized query performance ([829a585](https://github.com/Andi-IM/fintrack-saas/commit/829a585a28f4083ff657fe7125d833689483081f))
* implement server-side dashboard filtering with new architecture documentation and update README ([cf28047](https://github.com/Andi-IM/fintrack-saas/commit/cf28047d16ad312c3443137394a23fc20d43e033))
* implement server-side filtered cash flow module with repository layer, controller hooks, and associated UI components. ([c222ccd](https://github.com/Andi-IM/fintrack-saas/commit/c222ccd8e343670684a0e4f068af8285ecaef8e5))

# [1.8.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.7.0...v1.8.0-rc.1) (2026-06-26)


### Features

* implement cash flow dashboard features including data controllers, list components, and related test suites ([bdf9a23](https://github.com/Andi-IM/fintrack-saas/commit/bdf9a23b9ed652ef4f6c940dec5b01948a037719))
* implement multi-tenant row-level security across all tables and private storage buckets with optimized query performance ([829a585](https://github.com/Andi-IM/fintrack-saas/commit/829a585a28f4083ff657fe7125d833689483081f))
* implement server-side dashboard filtering with new architecture documentation and update README ([cf28047](https://github.com/Andi-IM/fintrack-saas/commit/cf28047d16ad312c3443137394a23fc20d43e033))
* implement server-side filtered cash flow module with repository layer, controller hooks, and associated UI components. ([c222ccd](https://github.com/Andi-IM/fintrack-saas/commit/c222ccd8e343670684a0e4f068af8285ecaef8e5))

# [1.7.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.1...v1.7.0) (2026-06-26)


### Bug Fixes

* Update frontend/features/receipts/components/ReceiptReviewForm.tsx ([40bbf69](https://github.com/Andi-IM/fintrack-saas/commit/40bbf698dc0229856c80e68716d3d5887f686da5))


### Features

* add Gemini-powered OCR parsing for receipts and bank statements and initialize frontend project structure ([cddf754](https://github.com/Andi-IM/fintrack-saas/commit/cddf754a2bf3582c4516cc4ed31749381ad41e23))
* **auth:** remove personal email and implement dynamic self-healing local auth ([25ea403](https://github.com/Andi-IM/fintrack-saas/commit/25ea403d15671127708ac30e4a833c9c92c63992))
* configure Next.js environment, establish test-specific TypeScript configurations, and initialize authentication login form ([345d322](https://github.com/Andi-IM/fintrack-saas/commit/345d3226fb8e0f91c7e1a620c75ba929b691c8a2))
* implement credential-based authentication and OCR receipt parsing infrastructure ([f27fe2e](https://github.com/Andi-IM/fintrack-saas/commit/f27fe2e99ebf28f376c93816d054f2bdc32d6349))
* implement OCR document parsing with Groq-backed OpenAI integration ([cad17dd](https://github.com/Andi-IM/fintrack-saas/commit/cad17dd26cf9bd502eac3161b02516c6a2d19411))
* implement OpenAI-based receipt and bank statement parsers using Groq API ([57f266d](https://github.com/Andi-IM/fintrack-saas/commit/57f266d1e07cc2237121e8c168310ba7ff3c3fe6))
* implement OpenAI-based receipt and bank statement parsers using Groq API ([75f3707](https://github.com/Andi-IM/fintrack-saas/commit/75f37073a129ecc41a2611257c27e5e8ed16f93b))
* implement receipt review form component and supporting infrastructure layouts ([ae17d99](https://github.com/Andi-IM/fintrack-saas/commit/ae17d9931cee6d196cb25bf45a6e4dc3aef3f903))

# [1.7.0-rc.6](https://github.com/Andi-IM/fintrack-saas/compare/v1.7.0-rc.5...v1.7.0-rc.6) (2026-06-26)


### Features

* implement OpenAI-based receipt and bank statement parsers using Groq API ([57f266d](https://github.com/Andi-IM/fintrack-saas/commit/57f266d1e07cc2237121e8c168310ba7ff3c3fe6))

# [1.7.0-rc.5](https://github.com/Andi-IM/fintrack-saas/compare/v1.7.0-rc.4...v1.7.0-rc.5) (2026-06-26)


### Features

* implement OpenAI-based receipt and bank statement parsers using Groq API ([75f3707](https://github.com/Andi-IM/fintrack-saas/commit/75f37073a129ecc41a2611257c27e5e8ed16f93b))

# [1.7.0-rc.4](https://github.com/Andi-IM/fintrack-saas/compare/v1.7.0-rc.3...v1.7.0-rc.4) (2026-06-26)


### Bug Fixes

* Update frontend/features/receipts/components/ReceiptReviewForm.tsx ([40bbf69](https://github.com/Andi-IM/fintrack-saas/commit/40bbf698dc0229856c80e68716d3d5887f686da5))

# [1.7.0-rc.3](https://github.com/Andi-IM/fintrack-saas/compare/v1.7.0-rc.2...v1.7.0-rc.3) (2026-06-26)


### Features

* implement receipt review form component and supporting infrastructure layouts ([ae17d99](https://github.com/Andi-IM/fintrack-saas/commit/ae17d9931cee6d196cb25bf45a6e4dc3aef3f903))

# [1.7.0-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.7.0-rc.1...v1.7.0-rc.2) (2026-06-26)


### Features

* implement OCR document parsing with Groq-backed OpenAI integration ([cad17dd](https://github.com/Andi-IM/fintrack-saas/commit/cad17dd26cf9bd502eac3161b02516c6a2d19411))

# [1.7.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.1...v1.7.0-rc.1) (2026-06-26)


### Features

* add Gemini-powered OCR parsing for receipts and bank statements and initialize frontend project structure ([cddf754](https://github.com/Andi-IM/fintrack-saas/commit/cddf754a2bf3582c4516cc4ed31749381ad41e23))
* **auth:** remove personal email and implement dynamic self-healing local auth ([25ea403](https://github.com/Andi-IM/fintrack-saas/commit/25ea403d15671127708ac30e4a833c9c92c63992))
* configure Next.js environment, establish test-specific TypeScript configurations, and initialize authentication login form ([345d322](https://github.com/Andi-IM/fintrack-saas/commit/345d3226fb8e0f91c7e1a620c75ba929b691c8a2))
* implement credential-based authentication and OCR receipt parsing infrastructure ([f27fe2e](https://github.com/Andi-IM/fintrack-saas/commit/f27fe2e99ebf28f376c93816d054f2bdc32d6349))

## [1.6.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.0...v1.6.1) (2026-06-22)


### Bug Fixes

* add required profile argument to revalidateTag for Next.js 16 ([53ffa6f](https://github.com/Andi-IM/fintrack-saas/commit/53ffa6f9bd15222bc066dbb3c12ade6ef64e4e92))
* move minimumReleaseAge to pnpm-workspace.yaml (pnpm v11 ignores .npmrc for non-auth settings) ([7671316](https://github.com/Andi-IM/fintrack-saas/commit/7671316beafc57f9f4676101214b5c64119db444))
* remove --no-lint from build script — not supported in Next.js 16 ([27ef33e](https://github.com/Andi-IM/fintrack-saas/commit/27ef33ee31b005b249a39742043e6268912db84c))
* replace Github icon from lucide-react with inline SVG ([13130b0](https://github.com/Andi-IM/fintrack-saas/commit/13130b0d7d6fe1fca7de0f146ea89150f214528e))
* resolve Next.js 16 build error — add turbopack config and remove deprecated eslint option ([2ffcc99](https://github.com/Andi-IM/fintrack-saas/commit/2ffcc9921b5797f1b824a4ea57ea7e71ebce7f45))
* set pnpm minimumReleaseAge to 6h to resolve CI supply-chain policy failure ([3744106](https://github.com/Andi-IM/fintrack-saas/commit/3744106edac4e06bc03e17708aa56d4ced650b26))

## [1.6.1-rc.6](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.1-rc.5...v1.6.1-rc.6) (2026-06-22)


### Bug Fixes

* add required profile argument to revalidateTag for Next.js 16 ([53ffa6f](https://github.com/Andi-IM/fintrack-saas/commit/53ffa6f9bd15222bc066dbb3c12ade6ef64e4e92))

## [1.6.1-rc.5](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.1-rc.4...v1.6.1-rc.5) (2026-06-22)


### Bug Fixes

* replace Github icon from lucide-react with inline SVG ([13130b0](https://github.com/Andi-IM/fintrack-saas/commit/13130b0d7d6fe1fca7de0f146ea89150f214528e))

## [1.6.1-rc.4](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.1-rc.3...v1.6.1-rc.4) (2026-06-22)


### Bug Fixes

* remove --no-lint from build script — not supported in Next.js 16 ([27ef33e](https://github.com/Andi-IM/fintrack-saas/commit/27ef33ee31b005b249a39742043e6268912db84c))

## [1.6.1-rc.3](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.1-rc.2...v1.6.1-rc.3) (2026-06-22)


### Bug Fixes

* move minimumReleaseAge to pnpm-workspace.yaml (pnpm v11 ignores .npmrc for non-auth settings) ([7671316](https://github.com/Andi-IM/fintrack-saas/commit/7671316beafc57f9f4676101214b5c64119db444))

## [1.6.1-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.1-rc.1...v1.6.1-rc.2) (2026-06-22)


### Bug Fixes

* resolve Next.js 16 build error — add turbopack config and remove deprecated eslint option ([2ffcc99](https://github.com/Andi-IM/fintrack-saas/commit/2ffcc9921b5797f1b824a4ea57ea7e71ebce7f45))

## [1.6.1-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.6.0...v1.6.1-rc.1) (2026-06-22)


### Bug Fixes

* set pnpm minimumReleaseAge to 6h to resolve CI supply-chain policy failure ([3744106](https://github.com/Andi-IM/fintrack-saas/commit/3744106edac4e06bc03e17708aa56d4ced650b26))

# [1.6.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.5.0...v1.6.0) (2026-06-22)


### Features

* add E2E test suite for receipt lifecycle and capture UI screenshots ([efff06d](https://github.com/Andi-IM/fintrack-saas/commit/efff06d9356d4311fed8364bbbac22b4089fdf27))

# [1.5.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.4.0...v1.5.0) (2026-06-21)


### Features

* add dashboard components and analytics views for financial insights ([e46f26b](https://github.com/Andi-IM/fintrack-saas/commit/e46f26b520f2ced63b5809f958b962583b08af8e))
* add lighthouse report and initial dashboard page structure ([66af572](https://github.com/Andi-IM/fintrack-saas/commit/66af572a40cc42773de076200fa1da6368d359d6))
* implement dashboard sidebar navigation and receipt management UI components ([4edff69](https://github.com/Andi-IM/fintrack-saas/commit/4edff6941e982c936b058747822bd73c7a9bca7b))
* implement instant navigation using Next.js loading.tsx files and skeleton components to optimize UX across dashboard modules. ([9e16551](https://github.com/Andi-IM/fintrack-saas/commit/9e1655182f1c6e45da4113a286f1bf5d0cc0334f))
* implement lazy-loaded dynamic dashboard charts with skeleton fallbacks ([968b82a](https://github.com/Andi-IM/fintrack-saas/commit/968b82a4c654b8d93f685afaee973006e3fcc7e2))
* implement mobile bottom navigation and optimize TBT via lazy-loaded statement components ([eb3e959](https://github.com/Andi-IM/fintrack-saas/commit/eb3e9597f04ab4ed2e9e25e81a6a397c41957a58))
* implement server actions for receipt management and add automated test documentation script ([a027545](https://github.com/Andi-IM/fintrack-saas/commit/a0275459c4b1b33549762d8a7a01cb521f238288))

# [1.5.0-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.5.0-rc.1...v1.5.0-rc.2) (2026-06-21)


### Features

* implement server actions for receipt management and add automated test documentation script ([a027545](https://github.com/Andi-IM/fintrack-saas/commit/a0275459c4b1b33549762d8a7a01cb521f238288))

# [1.5.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.4.0...v1.5.0-rc.1) (2026-06-21)


### Features

* add dashboard components and analytics views for financial insights ([e46f26b](https://github.com/Andi-IM/fintrack-saas/commit/e46f26b520f2ced63b5809f958b962583b08af8e))
* add lighthouse report and initial dashboard page structure ([66af572](https://github.com/Andi-IM/fintrack-saas/commit/66af572a40cc42773de076200fa1da6368d359d6))
* implement dashboard sidebar navigation and receipt management UI components ([4edff69](https://github.com/Andi-IM/fintrack-saas/commit/4edff6941e982c936b058747822bd73c7a9bca7b))
* implement instant navigation using Next.js loading.tsx files and skeleton components to optimize UX across dashboard modules. ([9e16551](https://github.com/Andi-IM/fintrack-saas/commit/9e1655182f1c6e45da4113a286f1bf5d0cc0334f))
* implement lazy-loaded dynamic dashboard charts with skeleton fallbacks ([968b82a](https://github.com/Andi-IM/fintrack-saas/commit/968b82a4c654b8d93f685afaee973006e3fcc7e2))
* implement mobile bottom navigation and optimize TBT via lazy-loaded statement components ([eb3e959](https://github.com/Andi-IM/fintrack-saas/commit/eb3e9597f04ab4ed2e9e25e81a6a397c41957a58))

# [1.4.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.3.0...v1.4.0) (2026-06-21)


### Features

* implement authentication infrastructure with middleware, server actions, and Vitest configuration ([53f42f2](https://github.com/Andi-IM/fintrack-saas/commit/53f42f21206ab355a0c2af28ef28de72e51b14cb))
* implement bank statement and receipt E2E tests with supporting repository and auth mocks ([fd64b18](https://github.com/Andi-IM/fintrack-saas/commit/fd64b182e3ecf4a63c19307b4a6130e41ef82ffe))
* implement BankStatementListView and add comprehensive unit tests for CashFlowList and CashFlowForm components ([c62e5bd](https://github.com/Andi-IM/fintrack-saas/commit/c62e5bd9aabee008588d5dcfcf15f54cdf0b5fb5))
* implement receipt and cash flow management features with comprehensive test coverage and CI workflow support ([1a4d3f7](https://github.com/Andi-IM/fintrack-saas/commit/1a4d3f7922dc0e4026ae36598495f67ef1bfb7a0))

# [1.4.0-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.4.0-rc.1...v1.4.0-rc.2) (2026-06-21)


### Features

* implement bank statement and receipt E2E tests with supporting repository and auth mocks ([fd64b18](https://github.com/Andi-IM/fintrack-saas/commit/fd64b182e3ecf4a63c19307b4a6130e41ef82ffe))
* implement receipt and cash flow management features with comprehensive test coverage and CI workflow support ([1a4d3f7](https://github.com/Andi-IM/fintrack-saas/commit/1a4d3f7922dc0e4026ae36598495f67ef1bfb7a0))

# [1.4.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.3.0...v1.4.0-rc.1) (2026-06-20)


### Features

* implement authentication infrastructure with middleware, server actions, and Vitest configuration ([53f42f2](https://github.com/Andi-IM/fintrack-saas/commit/53f42f21206ab355a0c2af28ef28de72e51b14cb))
* implement BankStatementListView and add comprehensive unit tests for CashFlowList and CashFlowForm components ([c62e5bd](https://github.com/Andi-IM/fintrack-saas/commit/c62e5bd9aabee008588d5dcfcf15f54cdf0b5fb5))

# [1.3.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.2.0...v1.3.0) (2026-06-20)


### Bug Fixes

* **e2e:** increase timeouts for CI environment and apply dynamic routing fix ([54383c9](https://github.com/Andi-IM/fintrack-saas/commit/54383c9664f60f3ccb2ca6ad503f1804b888590e))


### Features

* add responsive sidebar and bottom navigation components for app layout ([1050738](https://github.com/Andi-IM/fintrack-saas/commit/1050738facaf8c45afb5dcdd60b77b8720c239ee))
* implement E2E testing framework with Lighthouse CI and auth bypass support ([77a79bf](https://github.com/Andi-IM/fintrack-saas/commit/77a79bf391c2ac00c5d95988cd7c4c95dfecb2bc))
* implement receipt and bank statement scanning features with E2E testing infrastructure ([ecd2892](https://github.com/Andi-IM/fintrack-saas/commit/ecd2892e04715ac7433a241d0e09ae384d4a354e))

# [1.3.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.2.1-rc.1...v1.3.0-rc.1) (2026-06-20)


### Features

* add responsive sidebar and bottom navigation components for app layout ([1050738](https://github.com/Andi-IM/fintrack-saas/commit/1050738facaf8c45afb5dcdd60b77b8720c239ee))
* implement E2E testing framework with Lighthouse CI and auth bypass support ([77a79bf](https://github.com/Andi-IM/fintrack-saas/commit/77a79bf391c2ac00c5d95988cd7c4c95dfecb2bc))
* implement receipt and bank statement scanning features with E2E testing infrastructure ([ecd2892](https://github.com/Andi-IM/fintrack-saas/commit/ecd2892e04715ac7433a241d0e09ae384d4a354e))

## [1.2.1-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.2.0...v1.2.1-rc.1) (2026-06-20)


### Bug Fixes

* **e2e:** increase timeouts for CI environment and apply dynamic routing fix ([54383c9](https://github.com/Andi-IM/fintrack-saas/commit/54383c9664f60f3ccb2ca6ad503f1804b888590e))

# [1.2.0-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.2.0-rc.1...v1.2.0-rc.2) (2026-06-20)


### Bug Fixes

* **e2e:** increase timeouts for CI environment and apply dynamic routing fix ([54383c9](https://github.com/Andi-IM/fintrack-saas/commit/54383c9664f60f3ccb2ca6ad503f1804b888590e))

# [1.2.0](https://github.com/Andi-IM/fintrack-saas/compare/v1.1.0...v1.2.0) (2026-06-19)


### Features

* add @vercel/analytics for web analytics ([7787adc](https://github.com/Andi-IM/fintrack-saas/commit/7787adcd2e190f3ca3bd8e6f3fedd77ed6d73051))
* add @vercel/speed-insights to monitor web performance ([373ae58](https://github.com/Andi-IM/fintrack-saas/commit/373ae58d2ec8b49181aefbafd7fc2b5c33a06f90))

# [1.2.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.1.0...v1.2.0-rc.1) (2026-06-19)


### Features

* add @vercel/analytics for web analytics ([7787adc](https://github.com/Andi-IM/fintrack-saas/commit/7787adcd2e190f3ca3bd8e6f3fedd77ed6d73051))
* add @vercel/speed-insights to monitor web performance ([373ae58](https://github.com/Andi-IM/fintrack-saas/commit/373ae58d2ec8b49181aefbafd7fc2b5c33a06f90))

# [1.1.0-rc.3](https://github.com/Andi-IM/fintrack-saas/compare/v1.1.0-rc.2...v1.1.0-rc.3) (2026-06-19)


### Features

* add @vercel/speed-insights to monitor web performance ([373ae58](https://github.com/Andi-IM/fintrack-saas/commit/373ae58d2ec8b49181aefbafd7fc2b5c33a06f90))

# [1.1.0-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.1.0-rc.1...v1.1.0-rc.2) (2026-06-19)


### Bug Fixes

* persist recalculated item balances and scope delete pending state ([82532ae](https://github.com/Andi-IM/fintrack-saas/commit/82532ae5dd10e98c605d71374a5fac7200899184))

# [1.1.0-rc.1](https://github.com/Andi-IM/fintrack-saas/compare/v1.0.0...v1.1.0-rc.1) (2026-06-19)


### Bug Fixes

* **frontend:** resolve compilation errors and finalize auth/datalayer decoupling ([c3d8fc0](https://github.com/Andi-IM/fintrack-saas/commit/c3d8fc02c785aeb313d90a5723f708dfaac17ca6))


### Features

* abstract state management into useCashFlowController hook and implement repository pattern for database actions ([4dcc38e](https://github.com/Andi-IM/fintrack-saas/commit/4dcc38e908277a819ac22f8a175405f229df16cb))
* **frontend:** migrate codebase to feature-based architecture (ADR-033) ([8e1f1f1](https://github.com/Andi-IM/fintrack-saas/commit/8e1f1f1a3a0002627952bf0394f5ebaa91c1d22a))
* implement ADR-032 and configure folder-specific coverage gates for critical pathways ([f375531](https://github.com/Andi-IM/fintrack-saas/commit/f3755311f69f0b8ef98b7d376bf1a7399ce5f67c))

# 1.0.0 (2026-06-19)


### Bug Fixes

* **auth:** refine origin detection logic for login flow ([e9ccb83](https://github.com/Andi-IM/fintrack-saas/commit/e9ccb83e65266623509ee2c16a602eea4e2e7928))
* **charts:** resolve Recharts container size warning by adding minWidth/minHeight to StatementAnalytics ([3289e6e](https://github.com/Andi-IM/fintrack-saas/commit/3289e6ee68e675de541708033ef9a7338239320e))
* **layout:** resolve hydration error 418 and pathname null checks in BottomNav and Sidebar ([ca1b305](https://github.com/Andi-IM/fintrack-saas/commit/ca1b305733b6d1da859d0a7e5bfe8e55fc201ff5))
* resolve OAuth redirect origin dynamically using host header in production ([7f18c61](https://github.com/Andi-IM/fintrack-saas/commit/7f18c61170b35827e118fe97a93256c308a87a0e))
* resolve public OAuth origin using x-forwarded-host and Vercel URL in production ([583800f](https://github.com/Andi-IM/fintrack-saas/commit/583800f69c144c147765a86e40754b292fc20616))
* statically polyfill process.version in webpack configs to resolve supabase edge runtime warning ([16a2d59](https://github.com/Andi-IM/fintrack-saas/commit/16a2d59dac4d39f4623c44875de1d8064156ea12))


### Features

* add bank statement analytics dashboard with balance history and summary cards ([177ad4e](https://github.com/Andi-IM/fintrack-saas/commit/177ad4e39c414ee71d3edb3852b16f5bbb6ced66))
* add CashFlowList component with URL-synchronized filtering, pagination, and search capabilities ([bee5b8f](https://github.com/Andi-IM/fintrack-saas/commit/bee5b8f49f20d1c5e640a9f9e4cc7ffe29723cdd))
* add document-reader-service gitignore and documentation, rename front-end to frontend ([34ac0e0](https://github.com/Andi-IM/fintrack-saas/commit/34ac0e099e8cf67dc284667abe48179ccd5e0aec))
* add ScanDialog component and BNI bank statement parser for AI-assisted financial data extraction ([d7b41bc](https://github.com/Andi-IM/fintrack-saas/commit/d7b41bc2b379edab3435034fc3dd5fbe38c0dc3e))
* add SeaBank OCR statement parser and associated parsing constants ([f3f3c87](https://github.com/Andi-IM/fintrack-saas/commit/f3f3c87dd1689eca3b4a71f26f0f658b5b04ba6b))
* add transaction list, overview cards, and transaction chart components for dashboard visualization ([c0db64f](https://github.com/Andi-IM/fintrack-saas/commit/c0db64fb466a8ae67d23d385a028e2693fae8e49))
* implement AI-powered document scanning system with Supabase integration and BNI bank statement parsing ([af28935](https://github.com/Andi-IM/fintrack-saas/commit/af28935698c9d71a02f79f5671b5143187ccc9b5))
* implement AI-powered receipt and bank statement scanning with automated data extraction ([3705020](https://github.com/Andi-IM/fintrack-saas/commit/3705020c94c65c522fb9970c8911834049e2ff2a))
* implement API Key authentication for docTR OCR service ([6a30931](https://github.com/Andi-IM/fintrack-saas/commit/6a30931c46bb664bb5809ad65e36f8489dcd16f9))
* implement bank statement analytics service and tracking UI components ([a2f49ed](https://github.com/Andi-IM/fintrack-saas/commit/a2f49edb2f74d599ad0c04c54eb2e72405801f26))
* implement bank statement management system with OCR parsing, Supabase storage, and transaction tracking support ([acc2703](https://github.com/Andi-IM/fintrack-saas/commit/acc2703c371ac53e5119c8dec9b48847156ab497))
* implement bank statement management with CRUD operations, statement item editing, and schema support for balances ([563c5c4](https://github.com/Andi-IM/fintrack-saas/commit/563c5c48118638e4d0c1a0bd16b378e1abdaa26a))
* implement bank statement processing system with support for Jago and GoPay parsers ([7b09d47](https://github.com/Andi-IM/fintrack-saas/commit/7b09d47eee40c2b7c44b630711110b035ea3594c))
* implement BNI bank statement parsing with support for multiple formats and integrate into transaction scanning workflow ([9afa000](https://github.com/Andi-IM/fintrack-saas/commit/9afa00087770b7ffd41938bd6165d7aa7e0f28fa))
* implement comprehensive OCR-based document and bank statement parsing infrastructure ([224a38e](https://github.com/Andi-IM/fintrack-saas/commit/224a38ea628349d6d298107e4f352b3e8e66def1))
* implement core dashboard functionality including Supabase authentication, transaction management, and AI-powered document scanning. ([0b3b9c7](https://github.com/Andi-IM/fintrack-saas/commit/0b3b9c7e9fb564314a49f98c8d18bf3eb1f4b767))
* implement dashboard overview cards and financial insights components ([7e7dba6](https://github.com/Andi-IM/fintrack-saas/commit/7e7dba6aa1541492d1bec522d055367d72c2904d))
* implement extensible OCR processing pipeline and standardize server action responses using discriminated unions ([803a562](https://github.com/Andi-IM/fintrack-saas/commit/803a56222e19181e685492d651158015e0733859))
* implement GitHub OAuth authentication with server-side email whitelist enforcement ([6316c96](https://github.com/Andi-IM/fintrack-saas/commit/6316c967390586504b502535ed1a1b2e49f6f8a3))
* implement Google Cloud Vision OCR with local parsing logic for receipts and bank statements ([6e8ea03](https://github.com/Andi-IM/fintrack-saas/commit/6e8ea030ae842cdb61aa79147e338b9396b9c159))
* implement Jago bank statement OCR parser and add initial support for BNI, BSI, and SeaBank parsers ([771979c](https://github.com/Andi-IM/fintrack-saas/commit/771979c6000f975afbea2dcea5743055bb7ff020))
* implement OCR bank statement parsing infrastructure and add expert coding rules for agent development ([0bcb46c](https://github.com/Andi-IM/fintrack-saas/commit/0bcb46c32ae492f723a15ac393e03e35b30cc37f))
* implement OCR document scanning pipeline with AI integration and UI components ([fa99c73](https://github.com/Andi-IM/fintrack-saas/commit/fa99c73d93c048fdf386066f7bdbc6a6e1862b86))
* implement OCR processing pipeline for bank statements and receipts with multi-bank parser support ([f373236](https://github.com/Andi-IM/fintrack-saas/commit/f373236f27ef75c43f0680f4ef9c43d24dc47892))
* implement receipt and bank statement scanning with OCR integration ([459a924](https://github.com/Andi-IM/fintrack-saas/commit/459a9247358100a1e8978568a96f7dab622d566f))
* implement receipt editing system with UI components and database schema updates ([3978cba](https://github.com/Andi-IM/fintrack-saas/commit/3978cbac2241b3210b6560e3699d015e6b0da92f))
* implement receipt scanning and parsing engine with strategy pattern and database integration ([141b38b](https://github.com/Andi-IM/fintrack-saas/commit/141b38b9a8133941ea7c39315d39614d7a2558fc))
* implement semantic release workflow, configuration, rules, and documentation ([dde6db3](https://github.com/Andi-IM/fintrack-saas/commit/dde6db31e5646b5c56506bdc9d827bbc0ca4cb41))
* implement strategy pattern for document OCR and parsing with support for receipts and bank statements ([5fbed2d](https://github.com/Andi-IM/fintrack-saas/commit/5fbed2d6283837c6f8526180649302c354a74401))
* implement transaction management, financial charting, and OCR receipt processing with standardized project rules ([84cab98](https://github.com/Andi-IM/fintrack-saas/commit/84cab988c72efd12e2bc5b1f731be87a02a70f21))
* initialize frontend project with transaction management components and state architecture ([32310a0](https://github.com/Andi-IM/fintrack-saas/commit/32310a02cf4c42a62bc6b162bf48ca7e611625fd))
* initialize project with UI component library and finance tracker foundation ([8b78ce4](https://github.com/Andi-IM/fintrack-saas/commit/8b78ce45c41d8963541092cb7e36fe7fbec7b7e0))
* integrate docTR OCR service with frontend DocumentProcessor ([04938f7](https://github.com/Andi-IM/fintrack-saas/commit/04938f71a7d230d685e2f05f5526b76646518015))
* integrate Supabase for persistent data storage ([ce12cc6](https://github.com/Andi-IM/fintrack-saas/commit/ce12cc606113a939ab1162cf1ea0f0e94089cccc))
* **layout:** implement mobile BottomNav navigation and simplify sidebar ([e886139](https://github.com/Andi-IM/fintrack-saas/commit/e88613926449ecaf2ddcbd6c32c82964e21de972))
* route Bank Jago statements specifically to docTR OCR service ([bdac208](https://github.com/Andi-IM/fintrack-saas/commit/bdac2082182cfa7792acae8b53efbb6c9fc949d3))

# [1.0.0-rc.2](https://github.com/Andi-IM/fintrack-saas/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2026-06-19)


### Bug Fixes

* statically polyfill process.version in webpack configs to resolve supabase edge runtime warning ([16a2d59](https://github.com/Andi-IM/fintrack-saas/commit/16a2d59dac4d39f4623c44875de1d8064156ea12))

# 1.0.0-rc.1 (2026-06-19)


### Bug Fixes

* **auth:** refine origin detection logic for login flow ([e9ccb83](https://github.com/Andi-IM/fintrack-saas/commit/e9ccb83e65266623509ee2c16a602eea4e2e7928))
* **charts:** resolve Recharts container size warning by adding minWidth/minHeight to StatementAnalytics ([3289e6e](https://github.com/Andi-IM/fintrack-saas/commit/3289e6ee68e675de541708033ef9a7338239320e))
* **layout:** resolve hydration error 418 and pathname null checks in BottomNav and Sidebar ([ca1b305](https://github.com/Andi-IM/fintrack-saas/commit/ca1b305733b6d1da859d0a7e5bfe8e55fc201ff5))
* resolve OAuth redirect origin dynamically using host header in production ([7f18c61](https://github.com/Andi-IM/fintrack-saas/commit/7f18c61170b35827e118fe97a93256c308a87a0e))
* resolve public OAuth origin using x-forwarded-host and Vercel URL in production ([583800f](https://github.com/Andi-IM/fintrack-saas/commit/583800f69c144c147765a86e40754b292fc20616))


### Features

* add bank statement analytics dashboard with balance history and summary cards ([177ad4e](https://github.com/Andi-IM/fintrack-saas/commit/177ad4e39c414ee71d3edb3852b16f5bbb6ced66))
* add CashFlowList component with URL-synchronized filtering, pagination, and search capabilities ([bee5b8f](https://github.com/Andi-IM/fintrack-saas/commit/bee5b8f49f20d1c5e640a9f9e4cc7ffe29723cdd))
* add document-reader-service gitignore and documentation, rename front-end to frontend ([34ac0e0](https://github.com/Andi-IM/fintrack-saas/commit/34ac0e099e8cf67dc284667abe48179ccd5e0aec))
* add ScanDialog component and BNI bank statement parser for AI-assisted financial data extraction ([d7b41bc](https://github.com/Andi-IM/fintrack-saas/commit/d7b41bc2b379edab3435034fc3dd5fbe38c0dc3e))
* add SeaBank OCR statement parser and associated parsing constants ([f3f3c87](https://github.com/Andi-IM/fintrack-saas/commit/f3f3c87dd1689eca3b4a71f26f0f658b5b04ba6b))
* add transaction list, overview cards, and transaction chart components for dashboard visualization ([c0db64f](https://github.com/Andi-IM/fintrack-saas/commit/c0db64fb466a8ae67d23d385a028e2693fae8e49))
* implement AI-powered document scanning system with Supabase integration and BNI bank statement parsing ([af28935](https://github.com/Andi-IM/fintrack-saas/commit/af28935698c9d71a02f79f5671b5143187ccc9b5))
* implement AI-powered receipt and bank statement scanning with automated data extraction ([3705020](https://github.com/Andi-IM/fintrack-saas/commit/3705020c94c65c522fb9970c8911834049e2ff2a))
* implement API Key authentication for docTR OCR service ([6a30931](https://github.com/Andi-IM/fintrack-saas/commit/6a30931c46bb664bb5809ad65e36f8489dcd16f9))
* implement bank statement analytics service and tracking UI components ([a2f49ed](https://github.com/Andi-IM/fintrack-saas/commit/a2f49edb2f74d599ad0c04c54eb2e72405801f26))
* implement bank statement management system with OCR parsing, Supabase storage, and transaction tracking support ([acc2703](https://github.com/Andi-IM/fintrack-saas/commit/acc2703c371ac53e5119c8dec9b48847156ab497))
* implement bank statement management with CRUD operations, statement item editing, and schema support for balances ([563c5c4](https://github.com/Andi-IM/fintrack-saas/commit/563c5c48118638e4d0c1a0bd16b378e1abdaa26a))
* implement bank statement processing system with support for Jago and GoPay parsers ([7b09d47](https://github.com/Andi-IM/fintrack-saas/commit/7b09d47eee40c2b7c44b630711110b035ea3594c))
* implement BNI bank statement parsing with support for multiple formats and integrate into transaction scanning workflow ([9afa000](https://github.com/Andi-IM/fintrack-saas/commit/9afa00087770b7ffd41938bd6165d7aa7e0f28fa))
* implement comprehensive OCR-based document and bank statement parsing infrastructure ([224a38e](https://github.com/Andi-IM/fintrack-saas/commit/224a38ea628349d6d298107e4f352b3e8e66def1))
* implement core dashboard functionality including Supabase authentication, transaction management, and AI-powered document scanning. ([0b3b9c7](https://github.com/Andi-IM/fintrack-saas/commit/0b3b9c7e9fb564314a49f98c8d18bf3eb1f4b767))
* implement dashboard overview cards and financial insights components ([7e7dba6](https://github.com/Andi-IM/fintrack-saas/commit/7e7dba6aa1541492d1bec522d055367d72c2904d))
* implement extensible OCR processing pipeline and standardize server action responses using discriminated unions ([803a562](https://github.com/Andi-IM/fintrack-saas/commit/803a56222e19181e685492d651158015e0733859))
* implement GitHub OAuth authentication with server-side email whitelist enforcement ([6316c96](https://github.com/Andi-IM/fintrack-saas/commit/6316c967390586504b502535ed1a1b2e49f6f8a3))
* implement Google Cloud Vision OCR with local parsing logic for receipts and bank statements ([6e8ea03](https://github.com/Andi-IM/fintrack-saas/commit/6e8ea030ae842cdb61aa79147e338b9396b9c159))
* implement Jago bank statement OCR parser and add initial support for BNI, BSI, and SeaBank parsers ([771979c](https://github.com/Andi-IM/fintrack-saas/commit/771979c6000f975afbea2dcea5743055bb7ff020))
* implement OCR bank statement parsing infrastructure and add expert coding rules for agent development ([0bcb46c](https://github.com/Andi-IM/fintrack-saas/commit/0bcb46c32ae492f723a15ac393e03e35b30cc37f))
* implement OCR document scanning pipeline with AI integration and UI components ([fa99c73](https://github.com/Andi-IM/fintrack-saas/commit/fa99c73d93c048fdf386066f7bdbc6a6e1862b86))
* implement OCR processing pipeline for bank statements and receipts with multi-bank parser support ([f373236](https://github.com/Andi-IM/fintrack-saas/commit/f373236f27ef75c43f0680f4ef9c43d24dc47892))
* implement receipt and bank statement scanning with OCR integration ([459a924](https://github.com/Andi-IM/fintrack-saas/commit/459a9247358100a1e8978568a96f7dab622d566f))
* implement receipt editing system with UI components and database schema updates ([3978cba](https://github.com/Andi-IM/fintrack-saas/commit/3978cbac2241b3210b6560e3699d015e6b0da92f))
* implement receipt scanning and parsing engine with strategy pattern and database integration ([141b38b](https://github.com/Andi-IM/fintrack-saas/commit/141b38b9a8133941ea7c39315d39614d7a2558fc))
* implement semantic release workflow, configuration, rules, and documentation ([dde6db3](https://github.com/Andi-IM/fintrack-saas/commit/dde6db31e5646b5c56506bdc9d827bbc0ca4cb41))
* implement strategy pattern for document OCR and parsing with support for receipts and bank statements ([5fbed2d](https://github.com/Andi-IM/fintrack-saas/commit/5fbed2d6283837c6f8526180649302c354a74401))
* implement transaction management, financial charting, and OCR receipt processing with standardized project rules ([84cab98](https://github.com/Andi-IM/fintrack-saas/commit/84cab988c72efd12e2bc5b1f731be87a02a70f21))
* initialize frontend project with transaction management components and state architecture ([32310a0](https://github.com/Andi-IM/fintrack-saas/commit/32310a02cf4c42a62bc6b162bf48ca7e611625fd))
* initialize project with UI component library and finance tracker foundation ([8b78ce4](https://github.com/Andi-IM/fintrack-saas/commit/8b78ce45c41d8963541092cb7e36fe7fbec7b7e0))
* integrate docTR OCR service with frontend DocumentProcessor ([04938f7](https://github.com/Andi-IM/fintrack-saas/commit/04938f71a7d230d685e2f05f5526b76646518015))
* integrate Supabase for persistent data storage ([ce12cc6](https://github.com/Andi-IM/fintrack-saas/commit/ce12cc606113a939ab1162cf1ea0f0e94089cccc))
* **layout:** implement mobile BottomNav navigation and simplify sidebar ([e886139](https://github.com/Andi-IM/fintrack-saas/commit/e88613926449ecaf2ddcbd6c32c82964e21de972))
* route Bank Jago statements specifically to docTR OCR service ([bdac208](https://github.com/Andi-IM/fintrack-saas/commit/bdac2082182cfa7792acae8b53efbb6c9fc949d3))
