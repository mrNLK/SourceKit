# 21 — Audit and Fix Console Errors

Open the app in Chrome DevTools. Navigate through every tab and execute every major flow (build strategy, run search, open candidate, add to pipeline, bulk actions). Document every console error and warning. Fix all errors. For warnings from third-party libraries, suppress only if non-actionable. Ensure zero unhandled errors in the console across the full test flow. List each fix in the commit message.
