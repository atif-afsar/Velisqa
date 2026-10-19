/**
 * Post-import reconciliation (writes a PII-free JSON report; exit 2 on mismatch).
 *
 *   node scripts/verify-migration.mjs                          # compare with live Supabase (service role)
 *   node scripts/verify-migration.mjs --from-dir migration-exports/<ts>
 *
 * Checks: row counts per table, sum of order grand_total, per-order item count and
 * line-total sums for a sample, unique order_refs, dangling references, product
 * images still pointing at Supabase Storage, and orders whose guest token was not carried over.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { C, closeDb, connectDb } from '../src/config/db.js'
import { REFERENCES, TABLES } from './lib/supabaseMappers.mjs'

const { values: args } = parseArgs({ options: { 'from-dir': { type: 'string' }, sample: { type: 'string', default: '50' }, 'report-file': { type: 'string' } } })
const fromDir = args['from-dir'] ? path.resolve(args['from-dir']) : null
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

const loadDir = (table) => {
  const file = path.join(fromDir, `${table}.json`)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}

async function sourceCount(table) {
  if (fromDir) return loadDir(table)?.length ?? null
  if (!SUPABASE_URL) return null
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, { headers: { ...headers, Prefer: 'count=exact' } })
  if (!response.ok) return null
  return Number(response.headers.get('content-range')?.split('/')[1]) || 0
}

async function sourceOrders(limit) {
  if (fromDir) return (loadDir('orders') || []).slice(0, limit)
  if (!SUPABASE_URL) return []
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id,order_ref,grand_total,payment_status,order_status,order_items(id,line_total)&order=created_at.desc&limit=${limit}`, { headers })
  return response.ok ? response.json() : []
}

async function sourceGrandTotal() {
  if (fromDir) return (loadDir('orders') || []).reduce((sum, row) => sum + Math.round(Number(row.grand_total) * 100), 0) / 100
  return null
}

const db = await connectDb()
const report = { checkedAt: new Date(), source: fromDir ? `dir:${path.basename(fromDir)}` : SUPABASE_URL ? 'supabase' : 'none', counts: {}, problems: [] }

for (const table of ['users', ...TABLES]) {
  const target = await db.collection(table).countDocuments()
  const source = table === 'users' ? (fromDir ? loadDir('auth_users')?.length ?? null : null) : await sourceCount(table)
  report.counts[table] = { source, target }
  if (source != null && source !== target) report.problems.push({ type: 'count_mismatch', table, source, target })
}

const [targetTotal] = await db.collection(C.orders).aggregate([{ $group: { _id: null, total: { $sum: { $round: [{ $multiply: ['$grand_total', 100] }, 0] } } } }]).toArray()
report.orderGrandTotal = { source: await sourceGrandTotal(), target: (targetTotal?.total || 0) / 100 }
if (report.orderGrandTotal.source != null && report.orderGrandTotal.source !== report.orderGrandTotal.target) report.problems.push({ type: 'grand_total_mismatch', ...report.orderGrandTotal })

const dupRefs = await db.collection(C.orders).aggregate([{ $group: { _id: '$order_ref', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]).toArray()
if (dupRefs.length) report.problems.push({ type: 'duplicate_order_ref', count: dupRefs.length })

report.danglingReferences = {}
for (const [collection, field, target] of REFERENCES) {
  const ids = (await db.collection(collection).distinct(field)).filter((id) => id != null)
  if (!ids.length) continue
  const found = await db.collection(target).countDocuments({ _id: { $in: ids } })
  const missing = ids.length - found
  report.danglingReferences[`${collection}.${field}→${target}`] = missing
  // Deleted products are expected (order items keep their snapshot); everything else is a problem.
  if (missing && !(collection === 'order_items' && field === 'product_id') && !(collection === 'orders' && field === 'user_id')) {
    report.problems.push({ type: 'dangling_reference', ref: `${collection}.${field}→${target}`, missing })
  }
}

const sample = await sourceOrders(Number(args.sample) || 50)
let sampleMismatches = 0
for (const row of sample) {
  const order = await db.collection(C.orders).findOne({ _id: String(row.id) })
  const items = await db.collection(C.orderItems).find({ order_id: String(row.id) }).toArray()
  const sourceItems = row.order_items || (fromDir ? (loadDir('order_items') || []).filter((item) => item.order_id === row.id) : [])
  const sumPaise = (list) => list.reduce((sum, item) => sum + Math.round(Number(item.line_total) * 100), 0)
  const same =
    order
    && order.order_ref === row.order_ref
    && Math.round(order.grand_total * 100) === Math.round(Number(row.grand_total) * 100)
    && order.payment_status === row.payment_status
    && order.order_status === row.order_status
    && items.length === sourceItems.length
    && sumPaise(items) === sumPaise(sourceItems)
  if (!same) {
    sampleMismatches += 1
    report.problems.push({ type: 'sample_mismatch', orderRef: row.order_ref })
  }
}
report.sample = { checked: sample.length, mismatches: sampleMismatches }

report.ordersWithoutGuestToken = await db.collection(C.orders).countDocuments({ access_token_hash: null })
report.productsWithSupabaseImages = await db.collection(C.products).countDocuments({
  $or: [{ image_url: /\/storage\/v1\// }, { hover_image_url: /\/storage\/v1\// }, { gallery_urls: /\/storage\/v1\// }],
})
if (report.productsWithSupabaseImages) report.problems.push({ type: 'supabase_images_remaining', count: report.productsWithSupabaseImages, fix: 'npm run migrate:images -- --apply' })

const file = path.resolve(args['report-file'] || path.join('reports', `verify-${Date.now()}.json`))
mkdirSync(path.dirname(file), { recursive: true })
writeFileSync(file, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ counts: report.counts, problems: report.problems.length, sample: report.sample }, null, 2))
console.log(`report: ${file}`)
await closeDb()
process.exit(report.problems.length ? 2 : 0)
