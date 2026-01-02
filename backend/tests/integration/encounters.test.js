const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const BACKEND_DIR = path.resolve(__dirname, '../../')
const PORT = process.env.TEST_PORT || '3002'
const BASE = `http://localhost:${PORT}`

function getJson(url){
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try{
          const parsed = JSON.parse(data)
          resolve({ statusCode: res.statusCode, body: parsed })
        }catch(err){
          reject(err)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => {
      req.destroy(new Error('request timeout'))
    })
  })
}

function postJson(url, payload){
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const parsed = new URL(url)
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 3000
    }
    const req = http.request(opts, res => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => data += c)
      res.on('end', () => {
        try{
          const parsedBody = JSON.parse(data)
          resolve({ statusCode: res.statusCode, body: parsedBody })
        }catch(err){
          reject(err)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function waitForHealth(timeout = 5000){
  const start = Date.now()
  const URL = `${BASE}/health`
  return new Promise((resolve, reject) => {
    (function poll(){
      getJson(URL).then(resp => {
        if(resp.statusCode === 200 && resp.body && resp.body.status === 'ok') return resolve(resp.body)
        if(Date.now() - start > timeout) return reject(new Error('timeout waiting for healthy response'))
        setTimeout(poll, 200)
      }).catch(err => {
        if(Date.now() - start > timeout) return reject(new Error('timeout waiting for healthy response: ' + err.message))
        setTimeout(poll, 200)
      })
    })()
  })
}

async function run(){
  console.log('Starting backend server for encounters integration test on port', PORT)
  const child = spawn('node', ['src/index.js'], { cwd: BACKEND_DIR, env: { ...process.env, PORT }, stdio: ['ignore','pipe','pipe'] })

  child.stdout.on('data', d => process.stdout.write(`[server] ${d}`))
  child.stderr.on('data', d => process.stderr.write(`[server] ${d}`))

  let exited = false
  child.on('exit', code => {
    exited = true
    if(code !== 0){
      console.error('Server exited unexpectedly with code', code)
      process.exit(1)
    }
  })

  try{
    await waitForHealth(5000)

    // 1) Create encounter with provided anonymous_id and fields
    const payload1 = {
      anonymous_id: 'test-anon-123',
      gps_lat: 12.34,
      gps_lng: 56.78,
      location_notes: 'Under the bridge',
      risk_level: 'medium',
      observed_conditions: ['wet','injured'],
      services_requested: ['food'],
      referrals_given: ['shelter']
    }

    const res1 = await postJson(`${BASE}/encounters`, payload1)
    if(res1.statusCode !== 201){
      throw new Error('Expected 201 for create with provided anonymous_id, got ' + res1.statusCode)
    }
    const b1 = res1.body
    if(!b1.id) throw new Error('Response missing id')
    if(b1.anonymous_id !== payload1.anonymous_id) throw new Error('anonymous_id not preserved')
    if(b1.risk_level !== 'medium') throw new Error('risk_level not set')
    if(!Array.isArray(b1.observed_conditions) || b1.observed_conditions.length !== 2) throw new Error('observed_conditions not preserved')

    // 2) Create encounter without anonymous_id -> expect generated anonymous_id
    const payload2 = { gps_lat: 1, gps_lng: 2 }
    const res2 = await postJson(`${BASE}/encounters`, payload2)
    if(res2.statusCode !== 201) throw new Error('Expected 201 for create without anonymous_id')
    const b2 = res2.body
    if(!b2.anonymous_id || typeof b2.anonymous_id !== 'string') throw new Error('anonymous_id not present or not a string')
    // basic UUID shape check
    if(b2.anonymous_id.length !== 36 || b2.anonymous_id.indexOf('-') === -1) throw new Error('generated anonymous_id does not look like UUID')

    console.log('Encounters tests passed')
    child.kill()
    process.exit(0)
  }catch(err){
    console.error('Encounters tests failed:', err)
    if(!exited) child.kill()
    process.exit(1)
  }
}

run()
