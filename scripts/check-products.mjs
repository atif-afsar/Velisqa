import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await sb.from('products').select('name,category,image_url,price').order('category')
if (error) {
  console.log(JSON.stringify({ error: error.message }))
  process.exit(1)
}

const missingImage = data.filter((p) => !p.image_url)
const missingCategory = data.filter((p) => !p.category)
console.log(JSON.stringify({
  total: data.length,
  missingImage: missingImage.map((p) => p.name),
  missingCategory: missingCategory.map((p) => p.name),
  byCategory: Object.groupBy(data, (p) => p.category ?? 'none'),
}, null, 2))
