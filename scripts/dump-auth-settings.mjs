import { readFileSync, existsSync } from 'node:fs'

function loadEnv() {
  if (!existsSync('.env')) return {}
  const out = {}
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return out
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL.replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY
const res = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
const body = await res.json()
console.log(JSON.stringify(body?.external ?? body, null, 2))
