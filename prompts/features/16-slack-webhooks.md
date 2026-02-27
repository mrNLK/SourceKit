# 16 — Add Slack Integration for Pipeline Updates

Add a Slack webhook integration in Settings. When configured, automatically post to a Slack channel when: (1) a candidate is moved to "Contacted" stage, (2) a candidate is moved to "Screen" stage, (3) a bulk comparison is generated. Message format should be clean, compact, and include candidate name, score, GitHub URL, and stage. Include a "Mute Notifications" toggle per pipeline to avoid noise during high-volume sourcing.
