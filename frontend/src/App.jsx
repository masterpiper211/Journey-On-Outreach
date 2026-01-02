import React, { useState } from 'react'

const DEFAULT_CONDITIONS = [
  'Visible wounds',
  'Unsteady gait',
  'Sleeping',
  'Severe exposure (cold/heat)',
  'Behavioral distress'
]

export default function App(){
  const [risk, setRisk] = useState('low')
  const [notes, setNotes] = useState('')
  const [conditions, setConditions] = useState([])
  const [gps, setGps] = useState(null)
  const [loadingGps, setLoadingGps] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  function toggleCondition(cond){
    setConditions(prev => prev.includes(cond) ? prev.filter(c=>c!==cond) : [...prev, cond])
  }

  function captureGPS(){
    if(!navigator.geolocation){
      setMessage({type:'error', text:'Geolocation not supported by this browser.'})
      return
    }
    setLoadingGps(true)
    setMessage(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: gps_lat, longitude: gps_lng, accuracy } = pos.coords
        setGps({ gps_lat, gps_lng, accuracy, timestamp: pos.timestamp })
        setLoadingGps(false)
        setMessage({type:'success', text:'GPS captured.'})
      },
      err => {
        setLoadingGps(false)
        setMessage({type:'error', text:err.message})
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSubmit(e){
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    const payload = {
      anonymous_id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined,
      gps_lat: gps?.gps_lat ?? null,
      gps_lng: gps?.gps_lng ?? null,
      location_notes: notes || null,
      risk_level: risk,
      observed_conditions: conditions
    }

    try{
      const res = await fetch('/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if(res.status === 201){
        const body = await res.json()
        setMessage({type:'success', text:`Encounter saved (id: ${body.id})`})
        // reset form
        setRisk('low')
        setNotes('')
        setConditions([])
        setGps(null)
      } else {
        const err = await res.json().catch(()=>({ error: 'Unknown error' }))
        setMessage({type:'error', text: err.error || 'Failed to save encounter'})
      }
    }catch(err){
      setMessage({type:'error', text: err.message})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Journey On — Outreach Tracker</h1>
      </header>

      <main>
        <div className="container form-card">
          <h2>New Encounter</h2>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">Risk level</span>
              <div className="segmented">
                <label className={`seg-item ${risk==='low' ? 'active' : ''}`}>
                  <input type="radio" name="risk" value="low" checked={risk==='low'} onChange={()=>setRisk('low')} />
                  Low
                </label>
                <label className={`seg-item ${risk==='medium' ? 'active' : ''}`}>
                  <input type="radio" name="risk" value="medium" checked={risk==='medium'} onChange={()=>setRisk('medium')} />
                  Medium
                </label>
                <label className={`seg-item ${risk==='high' ? 'active' : ''}`}>
                  <input type="radio" name="risk" value="high" checked={risk==='high'} onChange={()=>setRisk('high')} />
                  High
                </label>
              </div>
            </label>

            <label className="field">
              <span className="label">Observed conditions</span>
              <div className="checkbox-grid">
                {DEFAULT_CONDITIONS.map(cond => (
                  <label key={cond} className="checkbox-item">
                    <input type="checkbox" checked={conditions.includes(cond)} onChange={()=>toggleCondition(cond)} />
                    <span>{cond}</span>
                  </label>
                ))}
              </div>
            </label>

            <label className="field">
              <span className="label">Location notes</span>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Short notes about the location or person (no PII)"></textarea>
            </label>

            <div className="field gps-row">
              <div>
                <button type="button" className="btn btn-secondary" onClick={captureGPS} disabled={loadingGps}> {loadingGps ? 'Capturing…' : 'Capture GPS'} </button>
                {gps && (
                  <div className="gps-info">
                    <small>Lat: {gps.gps_lat.toFixed(5)} · Lng: {gps.gps_lng.toFixed(5)}{gps.accuracy ? ` · acc ${Math.round(gps.accuracy)}m` : ''}</small>
                  </div>
                )}
              </div>
            </div>

            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Encounter'}</button>
            </div>

            {message && (
              <div className={`message ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>
            )}
          </form>

        </div>
      </main>
    </div>
  )
}
