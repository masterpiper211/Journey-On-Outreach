# Journey On — Backend

This folder contains the Express backend for Journey On Outreach Tracker.

Notes:
- REST API
- /health endpoint implemented in `src/index.js`
- Added REST endpoints for encounters (create, list, get, update) using in-memory storage
- Privacy-first: only use anonymous IDs (no PII stored)
- Fields supported for encounters:
  - `anonymous_id` (UUID)
  - `gps_lat`, `gps_lng` (numbers)
  - `location_notes` (string)
  - `risk_level` (`low` / `medium` / `high`)
  - `observed_conditions` (array of strings)
  - `services_requested` (array of strings)
  - `referrals_given` (array of strings)
  - `status` (string; e.g. `open`, `closed`)
- Port: 3000 by default

To run (after approval to add dependencies):
1. cd backend
2. npm install
3. npm start

Example API usage:
- POST /encounters -> create encounter
- GET /encounters -> list all encounters
- GET /encounters?anonymous_id=<uuid> -> list encounters for client
- GET /encounters/:id -> fetch single encounter
- PATCH /encounters/:id -> partial update

Ask before I add dependencies (Express, dev tooling).
