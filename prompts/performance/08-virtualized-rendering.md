# 08 — Optimize Candidate Card Rendering

If the Results tab renders 50+ candidate cards, the UI may lag. Implement virtualized rendering for the candidate card list. Use a library like @tanstack/react-virtual or react-window. Only render cards visible in the viewport plus a small overscan buffer. Ensure scrolling is smooth at 60fps with 100+ candidates. Maintain click handlers, star buttons, and card expand functionality.
