-- Example Postgres schema (privacy-first, no names)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE outreach_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  exported BOOLEAN DEFAULT FALSE
);

-- Consider views for CSV export that redact or reduce location precision.
