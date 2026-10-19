/**
 * Supabase (Postgres + Auth) → MongoDB importer.
 *
 * Reads with the Supabase service role (migration-only secrets, never used by
 * the API) and upserts into MongoDB by the original UUID. Re-running is safe:
 * nothing is deleted, unchanged rows are counted as "unchanged".
 *
 *   node scripts/migrate-supabase.mjs                       # dry run: fetch + map + report, no writes
 *   node scripts/migrate-supabase.mjs --apply               # write to MONGODB_URI (use STAGING first)
 *   node scripts/migrate-supabase.mjs --export-only         # save raw JSON to migration-exports/<ts>/ (contains PII!)
 *   node scripts/migrate-supabase.mjs --from-dir migration-exports/<ts> --apply   # import a saved export offline
 *   node scripts/migrate-supabase.mjs --apply --collection orders,order_items --since 2026-10-20T00:00:00Z
 *   node scripts/migrate-supabase.mjs --apply --resume      # continue from the last checkpoint
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required unless --from-dir),
 *      SUPABASE_DB_URL (optional: direct Postgres URL to carry bcrypt password hashes; needs `npm i --no-save pg`),
 *      MONGODB_URI / MONGODB_DB_NAME (target).
 */
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { C, closeDb, connectDb, ensureIndexes } from '../src/config/db.js'
import { refreshProductReviewAggregate } from '../src/services/catalogService.js'
import { mapAuthUser, mapRow, TABLES } from './lib/supabaseMappers.mjs'

const { values: args } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    'export-only': { type: 'boolean', default: false },
    'from-dir': { type: 'string' },
    collection: { type: 'string' },
    'batch-size': { type: 'string', default: '500' },
    since: { type: 'string' },
    'report-file': { type: 'string' },
    resume: { type: 'boolean', default: false },
    'skip-users': { type: 'boolean', default: false },
  },
})

const batchSize = Math.max(50, Math.min(2000, Number(args['batch-size']) || 500))
const only = args.collection ? new Set(args.collection.split(',').map((name) => name.trim())) : null
const wanted = (name) => !only || only.has(name)
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.SUPABASE_MIGRATION_URL || '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_MIGRATION_SERVICE_ROLE_KEY || ''
const fromDir = args['from-dir'] ? path.resolve(args['from-dir']) : null
const UPDATED_AT_TABLES = new Set(['products', 'orders', 'payments', 'refunds', 'product_reviews', 'order_returns'])

if (!fromDir && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or use --from-dir <export>).')
  process.exit(1)
}
if (args.apply && args['export-only']) {
  console.error('--apply and --export-only are mutually exclusive.')
  process.exit(1)
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' }

async function fetchJson(url) {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) })
    if (response.ok) return response.json()
    if (response.status === 404 || response.status === 400) {
      const body = await response.text()
      // Optional tables that were never created (e.g. creator_applications) are reported, not fatal.
      if (/does not exist|Could not find the table/i.test(body)) return null
      throw new Error(`${response.status} ${url.split('?')[0]}: ${body.slice(0, 200)}`)
    }
    if (attempt >= 4) throw new Error(`${response.status} ${url.split('?')[0]}`)
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
  }
}

async function* readTable(table, startOffset = 0) {
  if (fromDir) {
    const file = path.join(fromDir, `${table}.json`)
    if (!existsSync(file)) return
    const rows = JSON.parse(readFileSync(file, 'utf8'))
    for (let i = startOffset; i < rows.length; i += batchSize) yield { rows: rows.slice(i, i + batchSize), offset: i }
    return
  }
  const sinceColumn = UPDATED_AT_TABLES.has(table) ? 'updated_at' : table === 'payment_review_logs' ? 'reviewed_at' : table === 'order_returns' ? 'requested_at' : 'created_at'
  for (let offset = startOffset; ; offset += batchSize) {
    const params = new URLSearchParams({ select: '*', order: table === 'coupons' ? 'code.asc' : 'id.asc', limit: String(batchSize), offset: String(offset) })
    if (args.since) params.set(sinceColumn, `gte.${args.since}`)
    const rows = await fetchJson(`${SUPABASE_URL}/rest/v1/${table}?${params}`)
    if (rows === null) return
    if (!rows.length) return
    yield { rows, offset }
    if (rows.length < batchSize) return
  }
}

async function readAuthUsers() {
  if (fromDir) {
    const file = path.join(fromDir, 'auth_users.json')
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []
  }
  const users = []
  for (let page = 1; ; page += 1) {
    const body = await fetchJson(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`)
    const batch = body?.users || []
    users.push(...batch)
    if (batch.length < 1000) break
  }
  return users
}

async function readPasswordHashes() {
  if (fromDir) {
    const file = path.join(fromDir, 'auth_password_hashes.json')
    return new Map(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [])
  }
  if (!process.env.SUPABASE_DB_URL) return new Map()
  let pg
  try {
    pg = await import('pg')
  } catch {
    console.warn('SUPABASE_DB_URL is set but the `pg` package is missing: run `npm i --no-save pg`. Password hashes skipped (users will need "Forgot password").')
    return new Map()
  }
  const client = new pg.default.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const { rows } = await client.query("select id::text, encrypted_password from auth.users where encrypted_password is not null and encrypted_password <> ''")
    return new Map(rows.map((row) => [row.id, row.encrypted_password]))
  } finally {
    await client.end()
  }
}

/** Values the API maintains itself; re-imports must not overwrite them. */
const DERIVED_FIELDS = {
  products: ['rating', 'review_count'],
  orders: ['stock_applied', 'deleted_at', 'idempotency_key', 'idempotency_hash'],
  users: ['password_hash'],
}

const targetCollection = (table) => (table === 'auth_users' ? C.users : table)

function stableJson(doc) {
  return JSON.stringify(doc, (_key, value) => (value instanceof Date ? value.toISOString() : value))
}

async function upsertBatch(db, collectionName, docs, stats) {
  if (!docs.length) return
  const collection = db.collection(collectionName)
  const existing = await collection.find({ _id: { $in: docs.map((doc) => doc._id) } }).toArray()
  const byId = new Map(existing.map((doc) => [doc._id, doc]))
  const operations = []
  for (const doc of docs) {
    const current = byId.get(doc._id)
    if (current) {
      // Keep fields the API added after import (deleted_at, shipment locks, …) and derived values.
      const merged = { ...current, ...doc }
      for (const field of DERIVED_FIELDS[collectionName] || []) {
        if (current[field] != null) merged[field] = current[field]
      }
      // Same guest token → keep the existing ciphertext (a fresh random IV is not a real change).
      if (current.access_token_hash && current.access_token_hash === doc.access_token_hash) merged.access_token_enc = current.access_token_enc
      if (stableJson(merged) === stableJson(current)) {
        stats.unchanged += 1
        continue
      }
      operations.push({ replaceOne: { filter: { _id: doc._id }, replacement: merged } })
      stats.updated += 1
    } else {
      operations.push({ insertOne: { document: doc } })
      stats.inserted += 1
    }
  }
  if (!operations.length) return
  try {
    await collection.bulkWrite(operations, { ordered: false })
  } catch (error) {
    const failures = error?.writeErrors || []
    stats.failed += failures.length || operations.length
    for (const failure of failures.slice(0, 20)) {
      const op = operations[failure.index]
      stats.errors.push({ id: op?.insertOne?.document?._id || op?.replaceOne?.filter?._id, code: failure.code, message: String(failure.errmsg || '').slice(0, 160) })
    }
    if (!failures.length) throw error
  }
}

async function main() {
  const startedAt = new Date()
  const mode = args.apply ? 'apply' : args['export-only'] ? 'export-only' : 'dry-run'
  const report = { mode, source: fromDir ? `dir:${path.basename(fromDir)}` : 'supabase', since: args.since || null, startedAt, collections: {} }
  const exportDir = args['export-only'] ? path.resolve('migration-exports', startedAt.toISOString().replace(/[:.]/g, '-')) : null
  if (exportDir) mkdirSync(exportDir, { recursive: true })

  const db = args.apply || args.resume ? await connectDb() : null
  if (db) await ensureIndexes(db)

  // ── Auth users (+ optional bcrypt hashes) ──
  if (!args['skip-users'] && wanted('users')) {
    const users = await readAuthUsers()
    const hashes = await readPasswordHashes()
    const stats = { exported: users.length, inserted: 0, updated: 0, unchanged: 0, failed: 0, withPasswordHash: 0, googleLinked: 0, errors: [] }
    if (exportDir) {
      writeFileSync(path.join(exportDir, 'auth_users.json'), JSON.stringify(users))
      writeFileSync(path.join(exportDir, 'auth_password_hashes.json'), JSON.stringify([...hashes]))
    }
    const docs = users.map((user) => mapAuthUser(user, { passwordHash: hashes.get(String(user.id)) }))
    stats.withPasswordHash = docs.filter((doc) => doc.password_hash).length
    stats.googleLinked = docs.filter((doc) => doc.google_sub).length
    if (db) for (let i = 0; i < docs.length; i += batchSize) await upsertBatch(db, C.users, docs.slice(i, i + batchSize), stats)
    report.collections.users = stats
    console.log(`users: ${users.length} exported, ${stats.withPasswordHash} with password hash, ${stats.googleLinked} Google-linked`)
  }

  // ── Tables in dependency order ──
  for (const table of TABLES) {
    if (!wanted(table)) continue
    let startOffset = 0
    if (args.resume && db) {
      const state = await db.collection(C.migrationState).findOne({ _id: table })
      if (state?.completed && !args.since) {
        console.log(`${table}: already completed (checkpoint), skipping`)
        continue
      }
      startOffset = state?.offset || 0
    }
    const stats = { exported: 0, inserted: 0, updated: 0, unchanged: 0, failed: 0, mapErrors: 0, errors: [] }
    const raw = exportDir ? [] : null
    for await (const { rows, offset } of readTable(table, startOffset)) {
      stats.exported += rows.length
      if (raw) raw.push(...rows)
      const docs = []
      for (const row of rows) {
        try {
          docs.push(mapRow(table, row))
        } catch (error) {
          stats.mapErrors += 1
          stats.errors.push({ id: row.id || row.code, message: error.message })
        }
      }
      if (db && args.apply) {
        await upsertBatch(db, targetCollection(table), docs, stats)
        await db.collection(C.migrationState).updateOne({ _id: table }, { $set: { offset: offset + rows.length, updated_at: new Date() } }, { upsert: true })
      }
    }
    if (raw) writeFileSync(path.join(exportDir, `${table}.json`), JSON.stringify(raw))
    if (db && args.apply) await db.collection(C.migrationState).updateOne({ _id: table }, { $set: { completed: true, completed_at: new Date() } }, { upsert: true })
    report.collections[table] = stats
    console.log(`${table}: exported ${stats.exported}, inserted ${stats.inserted}, updated ${stats.updated}, unchanged ${stats.unchanged}, failed ${stats.failed + stats.mapErrors}`)
  }

  // Ratings follow the live rule (approved reviews only) once reviews are in.
  if (db && args.apply && wanted('product_reviews')) {
    const ids = await db.collection(C.products).distinct('_id')
    for (const id of ids) await refreshProductReviewAggregate(id)
    report.productAggregatesRefreshed = ids.length
  }

  report.finishedAt = new Date()
  const reportFile = path.resolve(args['report-file'] || path.join('reports', `migration-${mode}-${startedAt.toISOString().replace(/[:.]/g, '-')}.json`))
  mkdirSync(path.dirname(reportFile), { recursive: true })
  writeFileSync(reportFile, JSON.stringify(report, null, 2))
  console.log(`report: ${reportFile}${exportDir ? `\nexport (contains personal data — keep private): ${exportDir}` : ''}`)
  if (db) await closeDb()
  const failures = Object.values(report.collections).reduce((sum, stats) => sum + stats.failed + (stats.mapErrors || 0), 0)
  process.exit(failures ? 2 : 0)
}

main().catch(async (error) => {
  console.error('migration failed:', error.message)
  await closeDb().catch(() => {})
  process.exit(1)
})
