/**
 * Local development database: a single-node MongoDB replica set (transactions work like production).
 *
 *   npm run db:local
 *
 * Data lives OUTSIDE the project, in ~/.velisqa/mongo, so the backend folder stays deployable.
 * Keep this running in its own terminal; set in backend/.env:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/velisqa?replicaSet=rs0
 * Not for production — on the VPS / Atlas use a real MongoDB (see README).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

const dbPath = path.join(os.homedir(), '.velisqa', 'mongo')
fs.mkdirSync(dbPath, { recursive: true })

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ port: 27017, dbPath, storageEngine: 'wiredTiger' }],
})
console.log('Local MongoDB replica set ready:')
console.log('  MONGODB_URI=mongodb://127.0.0.1:27017/velisqa?replicaSet=rs0')
console.log(`(Ctrl+C to stop; data kept in ${dbPath})`)

async function stop() {
  await replSet.stop({ doCleanup: false })
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
