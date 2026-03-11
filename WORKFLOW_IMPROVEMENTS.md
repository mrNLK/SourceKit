# Workflow Improvements — SourceProof

**Generated:** 2026-03-03
**Branch:** `claude/sourceproof-qa-features-QTIRm`
**Context:** Post BUG-01–10, F1–F5, P1–P10 — all functional fixes done, now focusing on DX and CI/CD gaps.

---

## Current State

| Metric | Status |
|--------|--------|
| Tests | 124/124 passing (Vitest) |
| TypeScript | 0 errors (`tsc --noEmit`) |
| Build | Succeeds (~9s) |
| ESLint | 78 errors (mostly `no-explicit-any`), 11 warnings |
| CI/CD | **None** — no GitHub Actions |
| Formatting | **None** — no Prettier |
| Pre-commit hooks | **None** — no Husky |
| Test coverage | **Unknown** — no coverage tool |
| Component tests | **Zero** — only hooks/lib tested |
| E2E tests | **Zero** — no Playwright/Cypress |

---

## 10 Workflow Improvement Prompts

### W1: Add GitHub Actions CI pipeline
**Priority:** CRITICAL | **Category:** CI/CD

> Create `.github/workflows/ci.yml` that runs on push and PR to main. Steps: checkout, Node 20, `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Add a status badge to README.md. Use caching for node_modules. Set `concurrency` to cancel stale runs on the same branch.

### W2: Add Prettier + format enforcement
**Priority:** HIGH | **Category:** Code Quality

> Install `prettier` as a devDependency. Create `.prettierrc` with: `{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100, "tabWidth": 2 }`. Create `.prettierignore` (dist, node_modules, supabase/.temp). Add `"format": "prettier --write src/"` and `"format:check": "prettier --check src/"` scripts to package.json. Add `format:check` to the CI workflow.

### W3: Add Husky + lint-staged pre-commit hooks
**Priority:** HIGH | **Category:** Code Quality

> Install `husky` and `lint-staged` as devDependencies. Run `npx husky init`. Create `.husky/pre-commit` that runs `npx lint-staged`. Add to package.json: `"lint-staged": { "*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings 0"], "*.{json,md,css}": ["prettier --write"] }`. This ensures every commit is formatted and linted.

### W4: Fix all 78 ESLint `no-explicit-any` errors
**Priority:** HIGH | **Category:** Type Safety

> Re-enable `@typescript-eslint/no-unused-vars` as `"warn"` and add `"@typescript-eslint/no-explicit-any": "warn"` in `eslint.config.js`. Then fix the 78 `any` type usages across the codebase — the main offenders are: `src/lib/api.ts` (row mapping callbacks using `any`), `src/hooks/useWatchlist.ts` (3 instances of `i: any`), `src/components/PipelineTab.tsx` (drag event handlers), and Supabase query result types. Replace each `any` with the correct specific type or use `unknown` with type guards. Run `npm run lint` after each file to confirm zero new errors.

### W5: Add test coverage reporting with thresholds
**Priority:** HIGH | **Category:** Testing

> In `vitest.config.ts` (or the `test` block of `vite.config.ts`), add: `coverage: { provider: 'v8', reporter: ['text', 'lcov', 'json-summary'], reportsDirectory: './coverage', thresholds: { statements: 60, branches: 50, functions: 55, lines: 60 } }`. Install `@vitest/coverage-v8` as a devDependency. Add `"test:coverage": "vitest run --coverage"` to package.json scripts. Add `coverage/` to `.gitignore`. Add coverage to CI workflow.

### W6: Add component tests for SearchTab and PipelineTab
**Priority:** MEDIUM | **Category:** Testing

> Create `src/components/__tests__/SearchTab.test.tsx` and `PipelineTab.test.tsx`. For SearchTab: test that the search form submits and calls the API mock, that NL query preview renders when parser returns results, that error boundary renders fallback on throw. For PipelineTab: test that drag-and-drop moves a card between columns, that tag filtering hides/shows cards, that the Slack share button calls the webhook. Use `@testing-library/react` and `@testing-library/user-event`. Mock Supabase client and API functions. These are the two most complex components with zero test coverage.

### W7: Add `npm run ci` composite script and type-check
**Priority:** MEDIUM | **Category:** DX

> Add these scripts to package.json: `"type-check": "tsc --noEmit"`, `"lint:fix": "eslint . --fix"`, `"ci": "npm run type-check && npm run lint && npm test && npm run build"`. This gives developers a single command to validate everything locally before pushing. Update the GitHub Actions CI to use `npm run ci` instead of individual commands.

### W8: Add environment variable validation
**Priority:** MEDIUM | **Category:** Reliability

> Create `src/lib/env.ts` that validates all required environment variables at app startup. Use a simple validation approach: define a `REQUIRED_VARS` array with `['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']` and an `OPTIONAL_VARS` array. Export a `validateEnv()` function that throws a descriptive error listing all missing required vars. Call it in `src/main.tsx` before `ReactDOM.createRoot`. This prevents the app from silently failing with cryptic "fetch failed" errors when env vars are missing.

### W9: Add database seed script for local development
**Priority:** MEDIUM | **Category:** DX

> Create `supabase/seed.sql` with test data: 2 test users, 5 sample candidates in `candidates` table, 3 pipeline entries at different stages, 2 saved searches, 1 outreach sequence with 2 enrollments, and sample settings. Add `"db:seed": "supabase db reset"` and `"db:migrate": "supabase migration up"` scripts to package.json. Document in README how to set up local dev with `supabase start && npm run db:seed && npm run dev`.

### W10: Add Playwright E2E smoke test for critical path
**Priority:** LOW-MED | **Category:** Testing

> Install `@playwright/test` as a devDependency. Create `e2e/smoke.spec.ts` that tests the critical user path: load the app, verify dashboard renders, switch between tabs (Search, Pipeline, Outreach, Settings), enter a search query and verify the loading state appears, open a candidate slide-out and verify profile data renders. Add `"test:e2e": "playwright test"` to package.json. Create `playwright.config.ts` with `baseURL: 'http://localhost:5173'` and `webServer` config to start Vite. This catches integration regressions that unit tests miss.

---

## Execution Priority

| Phase | Prompts | Impact |
|-------|---------|--------|
| **Phase 1 — Quality gates** | W1, W2, W3, W7 | CI pipeline + formatting + hooks = no more broken commits |
| **Phase 2 — Type safety + coverage** | W4, W5, W6 | Fix `any` types, add coverage, test critical components |
| **Phase 3 — DX + reliability** | W8, W9, W10 | Env validation, seed data, E2E tests |

---

## Quick Wins (can be done immediately)

1. **W7** — Add `npm run ci` script (2 min, zero risk)
2. **W2** — Add Prettier config (5 min, improves every future commit)
3. **W5** — Add coverage reporting (5 min, visibility into gaps)
