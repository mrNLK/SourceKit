# 04 — Persist Pipeline and Watchlist Across Sessions

Audit the data persistence layer for Pipeline and Watchlist. Both must persist across: (1) page refresh, (2) tab switching, (3) logout/login. If using localStorage, ensure data is serialized correctly and loaded on app init. If using a backend/database, ensure writes happen on every state change (stage move, star toggle, candidate add) and reads happen on mount. Add error handling for corrupted or missing persisted data -- fall back to empty state, don't crash.
