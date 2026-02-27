# 09 — Add CSV Export

Add a CSV export button to the Results tab. The export should include these columns: rank, name, score, github_url, linkedin_url (if found), summary, contributed_repos (comma-separated), languages (comma-separated), stars, hidden_gem (true/false), eea_publications, eea_patents, eea_talks. Use proper CSV escaping for fields containing commas or quotes. Trigger a browser download with filename format: sourcekit-[role]-[company]-[YYYY-MM-DD].csv. Place the export button in the top-right of the Results tab header.
