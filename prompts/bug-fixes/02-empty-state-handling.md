# 02 — Fix Empty State Handling Across All Tabs

Audit every tab in the app (Results, History, Pipeline, Watchlist, Bulk Actions). For each tab, ensure there is a proper empty state component shown when no data exists. The empty state should: (1) clearly explain what the tab does, (2) tell the user what action to take to populate it, (3) not show loading spinners, error states, or blank white space. Check that navigating to any tab before running a search never throws an error or shows a broken layout.
