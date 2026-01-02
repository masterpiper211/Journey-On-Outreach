const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const BACKEND_DIR = path.resolve(__dirname, '../../')
const PORT = process.env.TEST_PORT || '3001'
const URL = `http://localhost:${PORT}/health`

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

function waitForHealth(timeout = 5000){
  const start = Date.now()
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
  console.log('Starting backend server for integration test on port', PORT)
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
    const body = await waitForHealth(5000)
    console.log('Health endpoint responded:', body)
    child.kill()
    process.exit(0)
  }catch(err){
    console.error('Health check failed:', err)
    if(!exited) child.kill()
    process.exit(1)
  }
}

run()
