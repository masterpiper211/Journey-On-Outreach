// Minimal Express server. Install dependencies first: npm install express
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Placeholder root
app.get('/', (req, res) => {
  res.json({ message: 'Journey On Outreach Tracker API' })
})

const { query } = require('./db');
const { randomUUID } = require('crypto');

function isValidRiskLevel(level){
  return ['low','medium','high'].includes(level)
}

// Create encounter
app.post('/encounters', async (req, res) => {
  const {
    anonymous_id,
    gps_lat,
    gps_lng,
    location_notes,
    risk_level = 'low',
    observed_conditions = [],
    services_requested = [],
    referrals_given = [],
    status = 'open'
  } = req.body;

  if (risk_level && !isValidRiskLevel(risk_level)) {
    return res.status(400).json({ error: 'risk_level must be one of low, medium, high' });
  }

  const anonId = anonymous_id || randomUUID();

  try {
    const result = await query(
      `INSERT INTO outreach_visits (anonymous_id, latitude, longitude, notes, risk_level, observed_conditions, services_requested, referrals_given, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, anonymous_id, occurred_at as created_at, updated_at, latitude as gps_lat, longitude as gps_lng, notes as location_notes, risk_level, observed_conditions, services_requested, referrals_given, status`,
      [
        anonId,
        typeof gps_lat === 'number' ? gps_lat : null,
        typeof gps_lng === 'number' ? gps_lng : null,
        location_notes || null,
        risk_level,
        Array.isArray(observed_conditions) ? observed_conditions : [],
        Array.isArray(services_requested) ? services_requested : [],
        Array.isArray(referrals_given) ? referrals_given : [],
        status,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating encounter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List encounters (optional filter by anonymous_id)
app.get('/encounters', async (req, res) => {
  const { anonymous_id } = req.query;
  try {
    let result;
    if (anonymous_id) {
      result = await query('SELECT id, anonymous_id, occurred_at as created_at, updated_at, latitude as gps_lat, longitude as gps_lng, notes as location_notes, risk_level, observed_conditions, services_requested, referrals_given, status FROM outreach_visits WHERE anonymous_id = $1 ORDER BY occurred_at DESC', [anonymous_id]);
    } else {
      result = await query('SELECT id, anonymous_id, occurred_at as created_at, updated_at, latitude as gps_lat, longitude as gps_lng, notes as location_notes, risk_level, observed_conditions, services_requested, referrals_given, status FROM outreach_visits ORDER BY occurred_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing encounters:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single encounter
app.get('/encounters/:id', async (req, res) => {
  try {
    const result = await query('SELECT id, anonymous_id, occurred_at as created_at, updated_at, latitude as gps_lat, longitude as gps_lng, notes as location_notes, risk_level, observed_conditions, services_requested, referrals_given, status FROM outreach_visits WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting encounter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update encounter (partial updates allowed)
app.patch('/encounters/:id', async (req, res) => {
  const updatable = {
    gps_lat: 'latitude',
    gps_lng: 'longitude',
    location_notes: 'notes',
    risk_level: 'risk_level',
    observed_conditions: 'observed_conditions',
    services_requested: 'services_requested',
    referrals_given: 'referrals_given',
    status: 'status'
  };

  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, column] of Object.entries(updatable)) {
    if (req.body[key] !== undefined) {
      if (key === 'risk_level' && !isValidRiskLevel(req.body[key])) {
        return res.status(400).json({ error: 'risk_level must be one of low, medium, high' });
      }
      if (['observed_conditions', 'services_requested', 'referrals_given'].includes(key) && !Array.isArray(req.body[key])) {
        return res.status(400).json({ error: `${key} must be an array` });
      }
      fields.push(`${column} = $${paramCount}`);
      values.push(req.body[key]);
      paramCount++;
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  fields.push(`updated_at = now()`);
  values.push(req.params.id);

  const q = `UPDATE outreach_visits SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, anonymous_id, occurred_at as created_at, updated_at, latitude as gps_lat, longitude as gps_lng, notes as location_notes, risk_level, observed_conditions, services_requested, referrals_given, status`;

  try {
    const result = await query(q, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating encounter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const csv = require('fast-csv');

// CSV Export
app.get('/encounters/export', async (req, res) => {
  try {
    const { rows } = await query('SELECT id, anonymous_id, occurred_at, latitude, longitude, notes, risk_level, observed_conditions, services_requested, referrals_given, status FROM outreach_visits ORDER BY occurred_at DESC');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="encounters.csv"');
    csv.write(rows, { headers: true }).pipe(res);
  } catch (err) {
    console.error('Error exporting encounters:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
