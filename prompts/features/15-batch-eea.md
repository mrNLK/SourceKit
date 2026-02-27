# 15 — Add Batch EEA Enrichment

Add a "Batch Enrich EEA" button to the Results tab that runs EEA enrichment on the top N candidates (configurable, default 10, max 20). Show a progress bar as each candidate is enriched. Use parallel requests (max 3 concurrent) to speed up the process. After completion, sort candidates so those with strong EEA signals (publications, patents, talks) bubble to the top. Add a filter toggle "Has EEA Signal" to the filter bar.
