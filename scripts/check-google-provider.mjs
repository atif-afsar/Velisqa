/**
 * Checks whether Google OAuth is enabled on the Supabase project in .env
 * Run: node scripts/check-google-provider.mjs
 */
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
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const projectRef = new URL(url).hostname.split('.')[0]
console.log('Project in .env:', projectRef)
console.log('Dashboard:', `https://supabase.com/dashboard/project/${projectRef}/auth/providers`)

const base = url.replace(/\/$/, '')
const authorizeUrl = `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('http://localhost:5173/auth/callback')}`
const res = await fetch(authorizeUrl, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  redirect: 'manual',
})

console.log('\nGoogle login probe (same as clicking Continue with Google):')
if (res.status >= 300 && res.status < 400) {
  console.log('  WORKING — redirect to:', (res.headers.get('location') ?? '').slice(0, 80) + '...')
} else {
  console.log('  NOT WORKING — status', res.status)
  console.log('  ', await res.text())
  console.log('\n  Dashboard "Enabled" badge is not enough.')
  console.log('  Click Google → enter Client ID + Secret → Save')
}
