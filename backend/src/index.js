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

// In-memory storage for encounters (privacy-first: no names/PII)
const encounters = []

function isValidRiskLevel(level){
  return ['low','medium','high'].includes(level)
}

// Create encounter
app.post('/encounters', (req, res) => {
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
  } = req.body

  if(risk_level && !isValidRiskLevel(risk_level)){
    return res.status(400).json({ error: 'risk_level must be one of low, medium, high' })
  }

  const { randomUUID } = require('crypto')
  const id = randomUUID()
  const anonId = anonymous_id || randomUUID()
  const now = new Date().toISOString()

  const encounter = {
    id,
    anonymous_id: anonId,
    gps_lat: typeof gps_lat === 'number' ? gps_lat : null,
    gps_lng: typeof gps_lng === 'number' ? gps_lng : null,
    location_notes: location_notes || null,
    risk_level,
    observed_conditions: Array.isArray(observed_conditions) ? observed_conditions : [],
    services_requested: Array.isArray(services_requested) ? services_requested : [],
    referrals_given: Array.isArray(referrals_given) ? referrals_given : [],
    status,
    created_at: now,
    updated_at: now
  }

  encounters.push(encounter)
  return res.status(201).json(encounter)
})

// List encounters (optional filter by anonymous_id)
app.get('/encounters', (req, res) => {
  const { anonymous_id } = req.query
  if(anonymous_id){
    return res.json(encounters.filter(e => e.anonymous_id === anonymous_id))
  }
  return res.json(encounters)
})

// Get single encounter
app.get('/encounters/:id', (req, res) => {
  const e = encounters.find(en => en.id === req.params.id)
  if(!e) return res.status(404).json({ error: 'not found' })
  return res.json(e)
})

// Update encounter (partial updates allowed)
app.patch('/encounters/:id', (req, res) => {
  const e = encounters.find(en => en.id === req.params.id)
  if(!e) return res.status(404).json({ error: 'not found' })

  const updatable = ['gps_lat','gps_lng','location_notes','risk_level','observed_conditions','services_requested','referrals_given','status']
  for(const key of updatable){
    if(req.body[key] !== undefined){
      if(key === 'risk_level' && !isValidRiskLevel(req.body[key])){
        return res.status(400).json({ error: 'risk_level must be one of low, medium, high' })
      }
      if(['observed_conditions','services_requested','referrals_given'].includes(key) && !Array.isArray(req.body[key])){
        return res.status(400).json({ error: `${key} must be an array` })
      }
      e[key] = req.body[key]
    }
  }
  e.updated_at = new Date().toISOString()
  return res.json(e)
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
