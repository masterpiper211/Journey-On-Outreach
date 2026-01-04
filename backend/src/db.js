const { Pool } = require('pg');
const { randomUUID } = require('crypto');

// If in test mode, use a mock query function
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    query: (text, params) => {
      // Mock for POST /encounters
      if (text.startsWith('INSERT INTO outreach_visits')) {
        const [
          anonymous_id,
          gps_lat,
          gps_lng,
          location_notes,
          risk_level,
          observed_conditions,
          services_requested,
          referrals_given,
          status,
        ] = params;
        const now = new Date().toISOString();
        const encounter = {
          id: randomUUID(),
          anonymous_id: anonymous_id || randomUUID(),
          created_at: now,
          updated_at: now,
          gps_lat,
          gps_lng,
          location_notes,
          risk_level,
          observed_conditions,
          services_requested,
          referrals_given,
          status,
        };
        return Promise.resolve({ rows: [encounter] });
      }
      // Mock for other queries if needed
      return Promise.resolve({ rows: [] });
    },
    pool: null, // No real pool in test mode
  };
} else {
  const pool = new Pool({
    // Uses environment variables for connection:
    // PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT
  });

  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
  };
}
