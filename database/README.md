# Database — Journey On Outreach Tracker

Privacy-first guidelines:
- Do NOT store personal names or PII. Use anonymous IDs only.
- Store minimal location data needed (consider reducing precision) and event timestamps.
- Ensure CSV exports do not include PII.

Schema (Postgres example) in `schema.sql`.

CSV export: create views that output anonymized rows and include export timestamps.
