# 19 — Add Error Boundary and Global Error Handling

Wrap the entire app in a React error boundary that catches render errors and shows a recovery UI instead of a white screen. Add a global unhandled promise rejection handler that logs errors and shows a toast notification. For all API calls (strategy build, search, EEA enrichment, LinkedIn lookup, outreach generation), ensure each has: (1) try/catch, (2) user-facing error message, (3) retry button where appropriate, (4) timeout after 90 seconds with a timeout-specific message.
