# 10 — Add Score Filtering and Sorting to Results

Add a filter bar to the top of the Results tab with: (1) a score range slider (min 0, max 100, default 0-100), (2) a "Hidden Gems Only" toggle, (3) sort dropdown with options: Score (High to Low), Score (Low to High), Stars (High to Low), Name (A-Z). Filters should apply client-side instantly without re-fetching. Show a count of "Showing X of Y candidates" that updates as filters change. Persist filter state while on the Results tab but reset on new search.
