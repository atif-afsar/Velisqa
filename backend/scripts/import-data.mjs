/**
 * Load data-export/*.json (from `npm run data:export`) into the MongoDB in MONGODB_URI.
 *
 *   node scripts/import-data.mjs              # adds missing documents, never overwrites
 *   node scripts/import-data.mjs --overwrite  # replaces documents that already exist (same _id)
 *   add --dir <folder> to read another export folder (default: backend/data-export)
 *
 * {{API_ORIGIN}} in image links becomes this server's PUBLIC_API_ORIGIN. Copy the old
 * uploads/ folder to MEDIA_DIR as well, or those images will 404.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BSON } from 'mongodb'
import { closeDb, connectDb, ensureIndexes } from '../src/config/db.js'
import { env } from '../src/config/env.js'

const dirArg = process.argv.indexOf('--dir')
const DIR = dirArg > 0 ? path.resolve(process.argv[dirArg + 1]) : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data-export')
const overwrite = process.argv.includes('--overwrite')

if (!fs.existsSync(DIR)) {
  console.error(`No export found at ${DIR}. Run npm run data:export on the source machine first.`)
  process.exit(1)
}

const db = await connectDb()
await ensureIndexes()
for (const file of fs.readdirSync(DIR).filter((name) => name.endsWith('.json')).sort()) {
  const name = file.replace(/\.json$/, '')
  const text = fs.readFileSync(path.join(DIR, file), 'utf8').split('{{API_ORIGIN}}').join(env.apiOrigin)
  const docs = BSON.EJSON.parse(text, { relaxed: false })
  if (!docs.length) continue
  const result = await db.collection(name).bulkWrite(
    docs.map((doc) =>
      overwrite
        ? { replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }
        : { updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true } },
    ),
    { ordered: false },
  )
  console.log(`${name}: ${result.upsertedCount} added, ${result.modifiedCount} replaced, ${docs.length} in file`)
}
await closeDb()
