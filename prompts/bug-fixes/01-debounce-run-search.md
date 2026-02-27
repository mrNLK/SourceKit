# 01 — Debounce Run Search Button

Review the search execution flow in the app. Add debouncing to the "Run Search" and "Build Sourcing Strategy" buttons so that rapid double-clicks don't trigger duplicate API calls. Use a loading state flag that disables the button while a request is in flight. Show a spinner on the button during execution. Re-enable only after the response resolves or errors. Do not use setTimeout-based debouncing -- use a proper isLoading state guard.
