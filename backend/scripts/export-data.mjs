/**
 * Export the store data (catalogue, coupons, homepage banners) to data-export/*.json so it can be
 * loaded into another MongoDB with `npm run data:import`.
 *
 *   node scripts/export-data.mjs [--dir <folder>]   (default: backend/data-export)
 *
 * Self-hosted image links (PUBLIC_API_ORIGIN/api/v1/media/...) are written as {{API_ORIGIN}} and
 * re-pointed at the target server's PUBLIC_API_ORIGIN on import. Users, sessions, orders and logs
 * are deliberately not exported.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BSON } from 'mongodb'
import { C, closeDb, connectDb } from '../src/config/db.js'
import { env } from '../src/config/env.js'

export const EXPORT_COLLECTIONS = [C.products, C.coupons, C.siteSettings]
const dirArg = process.argv.indexOf('--dir')
const OUT_DIR = dirArg > 0 ? path.resolve(process.argv[dirArg + 1]) : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data-export')

const db = await connectDb()
fs.mkdirSync(OUT_DIR, { recursive: true })
for (const name of EXPORT_COLLECTIONS) {
  const docs = await db.collection(name).find().sort({ _id: 1 }).toArray()
  const text = BSON.EJSON.stringify(docs, null, 2, { relaxed: false }).split(env.apiOrigin).join('{{API_ORIGIN}}')
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), text + '\n')
  console.log(`exported ${name}: ${docs.length}`)
}
await closeDb()
