# ADR-037: Integrate Lighthouse CI for Performance Testing

## Status
Proposed

## Context
Performance metrics (Core Web Vitals) such as FCP, LCP, INP, CLS, FID, and TTFB directly impact user experience and SEO rankings. Currently, we do not have an automated mechanism to prevent performance regressions from being merged into our branches. We need a way to assert performance budgets during both local development and Continuous Integration (CI) runs.

## Decision
We will integrate **Lighthouse CI (LHCI)** into the `frontend/e2e` workspace to automate performance audits.
1. Target thresholds will align with Google/Vercel's recommended thresholds:
   - **LCP** (Largest Contentful Paint) < 2.5s
   - **CLS** (Cumulative Layout Shift) < 0.25
   - **TBT** (Total Blocking Time) < 200ms (as a lab proxy for FID < 100ms and INP < 200ms)
2. To accommodate resource variance and hardware limits in GitHub Actions runners:
   - **FCP** (First Contentful Paint) and **TTFB** (Server Response Time) will be configured as `warn` level assertions to prevent false-positive CI failures.
   - **LCP**, **CLS**, and **TBT** will trigger `error` level failures.
3. Configure LHCI in a `.lighthouserc.json` file inside the `frontend/e2e` directory.
4. Add a `test:perf` script to `frontend/e2e/package.json` to execute `lhci autorun`.
5. Integrate the `pnpm test:perf` audit step into the GitHub Actions test workflow immediately following production builds.

## Alternatives Considered
- **Manual Audits via Chrome DevTools**: While useful for local development, it cannot be automated in CI and relies on developers remembers to run audits manually.
- **Cypress/Playwright Performance Plugin**: E2E framework-based performance testing adds significant execution overhead and is harder to manage compared to Lighthouse's dedicated, standardized scoring engine.

## Consequences
- **Positive**: We will have automated protection against code changes that degrade performance.
- **Negative**: Adds approximately 1–2 minutes to the CI workflow run time as Lighthouse launches headless Chrome and performs multiple test runs to verify stability.
- **Maintenance**: Thresholds may need to be adjusted as page features grow or if GitHub Actions runner latency changes significantly.

## Related Notes
- Lighthouse CI Configuration: [frontend/e2e/.lighthouserc.json](file:///D:/01_Projects/fintrack-saas/frontend/e2e/.lighthouserc.json)
- CI Workflow: [.github/workflows/test.yml](file:///D:/01_Projects/fintrack-saas/.github/workflows/test.yml)
- Next.js Web Vitals hooks: `@vercel/speed-insights` in [frontend/package.json](file:///D:/01_Projects/fintrack-saas/frontend/package.json#L25)
