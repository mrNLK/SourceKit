# 17 — Add Dark/Light Mode Toggle

The app currently uses a dark theme. Add a theme toggle in the top nav (sun/moon icon). Implement a light mode with: background #fafafa, surface #ffffff, border #e0e0e0, text #1a1a2e, accent #00c48c. Store preference in localStorage. Apply theme via CSS custom properties so the switch is instant with no flash. Default to dark. Respect system preference (prefers-color-scheme) on first visit.
