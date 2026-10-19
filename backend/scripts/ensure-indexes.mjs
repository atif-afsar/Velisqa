/** Creates/updates every MongoDB index the API relies on. Safe to re-run. */
import { closeDb, connectDb, ensureIndexes, INDEXES, supportsTransactions } from '../src/config/db.js'

const db = await connectDb()
await ensureIndexes(db)
console.log(`indexes ensured on ${Object.keys(INDEXES).length} collections`)
console.log(`replica set / transactions: ${(await supportsTransactions(db)) ? 'yes' : 'NO — configure a replica set before going live'}`)
await closeDb()
