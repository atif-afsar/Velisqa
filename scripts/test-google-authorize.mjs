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
const base = env.VITE_SUPABASE_URL.replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY
const redirect = 'http://localhost:5173/auth/callback'

const url = `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`
const res = await fetch(url, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  redirect: 'manual',
})

console.log('Status:', res.status)
console.log('Location header:', res.headers.get('location')?.slice(0, 120) ?? '(none)')
if (res.status === 400) {
  console.log('Body:', await res.text())
} else if (res.status >= 300 && res.status < 400) {
  console.log('OK — Google OAuth redirect would work (redirect to Google).')
}
