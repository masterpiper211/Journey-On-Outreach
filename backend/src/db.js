const { Pool } = require('pg');
const { randomUUID } = require('crypto');

// If in test mode, use a mock query function
if (process.env.NODE_ENV === 'test') {
  const encounters = []; // Stateful in-memory store for test data

  function dbRowToApi(row) {
    if (!row) return null;
    return {
      id: row.id,
      anonymous_id: row.anonymous_id,
      created_at: row.occurred_at,
      updated_at: row.updated_at,
      gps_lat: row.latitude,
      gps_lng: row.longitude,
      location_notes: row.notes,
      risk_level: row.risk_level,
      observed_conditions: row.observed_conditions,
      services_requested: row.services_requested,
      referrals_given: row.referrals_given,
      status: row.status,
    };
  }

  module.exports = {
    query: (text, params) => {
      // Mock INSERT for POST /encounters
      if (text.startsWith('INSERT INTO outreach_visits')) {
        const [
          anonymous_id,
          latitude,
          longitude,
          notes,
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
          occurred_at: now,
          updated_at: now,
          latitude,
          longitude,
          notes,
          risk_level,
          observed_conditions,
          services_requested,
          referrals_given,
          status,
        };
        encounters.push(encounter);
        return Promise.resolve({ rows: [dbRowToApi(encounter)] });
      }

      // Mock SELECT for GET /encounters and GET /encounters/:id
      if (text.startsWith('SELECT')) {
        if (text.includes('WHERE id = $1')) {
          const [id] = params;
          const encounter = encounters.find(e => e.id === id);
          return Promise.resolve({ rows: encounter ? [dbRowToApi(encounter)] : [] });
        }
        if (text.includes('WHERE anonymous_id = $1')) {
          const [anonId] = params;
          const results = encounters.filter(e => e.anonymous_id === anonId);
          return Promise.resolve({ rows: results.map(dbRowToApi) });
        }
        // General select all for list and export
        return Promise.resolve({ rows: encounters.map(dbRowToApi) });
      }

      // Mock UPDATE for PATCH /encounters/:id
      if (text.startsWith('UPDATE outreach_visits')) {
        const id = params[params.length - 1];
        const encounter = encounters.find(e => e.id === id);

        if (!encounter) {
          return Promise.resolve({ rows: [] });
        }

        const setClause = text.substring(text.indexOf('SET ') + 4, text.indexOf(' WHERE'));
        const columnsToUpdate = setClause
          .split(',')
          .map(s => s.split('=')[0].trim())
          .filter(c => c !== 'updated_at');

        columnsToUpdate.forEach((column, index) => {
          encounter[column] = params[index];
        });
        encounter.updated_at = new Date().toISOString();

        return Promise.resolve({ rows: [dbRowToApi(encounter)] });
      }

      // Default empty result for any other query
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
