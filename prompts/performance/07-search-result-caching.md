# 07 — Add Search Result Caching

Implement client-side caching for search results. When a search completes, store the results keyed by a hash of the search query + strategy config. When the user navigates away from Results and comes back, load from cache instead of re-fetching. When the user clicks "Re-run" from History, check cache first and show cached results with a "Results from [timestamp]. Click to refresh." banner. Use sessionStorage or an in-memory store -- not localStorage (results can be large).
