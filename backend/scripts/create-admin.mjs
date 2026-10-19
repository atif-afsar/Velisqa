/**
 * CLI-only admin bootstrap (there is deliberately no API for promoting roles).
 *
 *   node scripts/create-admin.mjs --email owner@velisqa.com --password 'StrongPass!' [--name "Owner"]
 *   node scripts/create-admin.mjs --email existing@velisqa.com --promote
 *   node scripts/create-admin.mjs --email someone@velisqa.com --demote
 *
 * Prefer passing the password via ADMIN_PASSWORD env to keep it out of shell history.
 */
import { parseArgs } from 'node:util'
import { C, closeDb, connectDb, ensureIndexes } from '../src/config/db.js'
import { hashPassword, uuid } from '../src/lib/crypto.js'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string' },
    promote: { type: 'boolean', default: false },
    demote: { type: 'boolean', default: false },
  },
})

const email = String(values.email || '').trim().toLowerCase()
const password = values.password || process.env.ADMIN_PASSWORD || ''
if (!email) {
  console.error('Usage: --email <address> [--password <pw> | ADMIN_PASSWORD env] [--name <name>] [--promote | --demote]')
  process.exit(1)
}

const db = await connectDb()
await ensureIndexes(db)
const now = new Date()
let user = await db.collection(C.users).findOne({ email })

if (values.demote) {
  if (!user) throw new Error('No such user.')
  await db.collection(C.profiles).updateOne({ _id: user._id }, { $set: { role: 'user' } })
} else {
  if (!user) {
    if (values.promote) throw new Error('No such user; omit --promote to create one.')
    if (password.length < 10) throw new Error('Admin passwords must be at least 10 characters.')
    user = {
      _id: uuid(),
      email,
      password_hash: await hashPassword(password),
      google_sub: null,
      email_verified: true,
      full_name: values.name || null,
      disabled: false,
      created_at: now,
      updated_at: now,
    }
    await db.collection(C.users).insertOne(user)
  } else if (password) {
    await db.collection(C.users).updateOne({ _id: user._id }, { $set: { password_hash: await hashPassword(password), updated_at: now } })
  }
  await db.collection(C.profiles).updateOne(
    { _id: user._id },
    { $set: { role: 'admin', email }, $setOnInsert: { _id: user._id, full_name: values.name || user.full_name || null, created_at: now } },
    { upsert: true },
  )
}

await db.collection(C.adminAuditLogs).insertOne({
  _id: uuid(),
  actor_id: null,
  action: values.demote ? 'cli.admin.demote' : 'cli.admin.grant',
  target_type: 'user',
  target_id: user._id,
  summary: { via: 'scripts/create-admin.mjs' },
  created_at: now,
})
console.log(`${values.demote ? 'Demoted' : 'Admin ready'}: ${email} (${user._id})`)
await closeDb()
