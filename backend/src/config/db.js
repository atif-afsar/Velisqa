import { MongoClient } from 'mongodb'
import { env } from './env.js'
import { logger } from '../lib/logger.js'

/** Collection names (snake_case, matching the old Postgres tables). */
export const C = Object.freeze({
  users: 'users',
  profiles: 'profiles',
  sessions: 'sessions',
  passwordResets: 'password_resets',
  products: 'products',
  coupons: 'coupons',
  orders: 'orders',
  orderItems: 'order_items',
  payments: 'payments',
  paymentEvents: 'payment_events',
  paymentReviewLogs: 'payment_review_logs',
  refunds: 'refunds',
  orderStatusHistory: 'order_status_history',
  productReviews: 'product_reviews',
  orderReturns: 'order_returns',
  orderReturnItems: 'order_return_items',
  creatorApplications: 'creator_applications',
  webhookEvents: 'webhook_events',
  metaEvents: 'meta_events',
  adminAuditLogs: 'admin_audit_logs',
  migrationState: 'migration_state',
  siteSettings: 'site_settings',
})

const ACTIVE_RETURN = ['pending', 'approved', 'pickup_scheduled', 'in_transit', 'received', 'qc_passed', 'qc_failed']

/** Every index the application relies on. Idempotent: safe on every boot. */
export const INDEXES = {
  [C.users]: [
    { key: { email: 1 }, unique: true },
    { key: { google_sub: 1 }, unique: true, partialFilterExpression: { google_sub: { $type: 'string' } } },
  ],
  [C.profiles]: [{ key: { role: 1 } }],
  [C.sessions]: [
    { key: { token_hash: 1 }, unique: true },
    { key: { user_id: 1 } },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },
  ],
  [C.passwordResets]: [
    { key: { token_hash: 1 }, unique: true },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },
  ],
  [C.products]: [
    { key: { created_at: -1 } },
    { key: { category: 1, created_at: -1 } },
    { key: { name: 'text', description: 'text', search_keywords: 'text' }, name: 'products_text' },
  ],
  [C.orders]: [
    { key: { order_ref: 1 }, unique: true },
    { key: { access_token_hash: 1 }, unique: true, partialFilterExpression: { access_token_hash: { $type: 'string' } } },
    { key: { idempotency_key: 1 }, unique: true, partialFilterExpression: { idempotency_key: { $type: 'string' } } },
    { key: { razorpay_order_id: 1 }, partialFilterExpression: { razorpay_order_id: { $type: 'string' } } },
    { key: { nimbuspost_awb: 1 }, partialFilterExpression: { nimbuspost_awb: { $type: 'string' } } },
    { key: { user_id: 1, created_at: -1 } },
    { key: { created_at: -1 } },
    { key: { payment_status: 1, created_at: -1 } },
    { key: { order_status: 1 } },
  ],
  [C.orderItems]: [{ key: { order_id: 1, created_at: 1 } }, { key: { product_id: 1 } }],
  [C.payments]: [
    { key: { provider: 1, provider_order_id: 1 }, unique: true },
    { key: { order_id: 1 } },
    { key: { provider_payment_id: 1 }, partialFilterExpression: { provider_payment_id: { $type: 'string' } } },
  ],
  [C.paymentEvents]: [{ key: { provider: 1, event_id: 1 }, unique: true }],
  [C.paymentReviewLogs]: [{ key: { order_id: 1, reviewed_at: -1 } }],
  [C.refunds]: [{ key: { provider_refund_id: 1 }, unique: true }, { key: { order_id: 1 } }],
  [C.orderStatusHistory]: [{ key: { order_id: 1, created_at: 1 } }],
  [C.productReviews]: [
    { key: { user_id: 1, product_id: 1 }, unique: true },
    { key: { product_id: 1, status: 1, created_at: -1 } },
    { key: { status: 1, created_at: 1 } },
  ],
  [C.orderReturns]: [
    { key: { order_id: 1 }, unique: true, name: 'one_active_return_per_order', partialFilterExpression: { status: { $in: ACTIVE_RETURN } } },
    { key: { status: 1, requested_at: 1 } },
    { key: { user_id: 1, requested_at: -1 } },
  ],
  [C.orderReturnItems]: [{ key: { return_id: 1, order_item_id: 1 }, unique: true }],
  [C.creatorApplications]: [{ key: { status: 1 } }, { key: { created_at: -1 } }],
  [C.webhookEvents]: [{ key: { provider: 1, event_key: 1 }, unique: true }],
  [C.metaEvents]: [{ key: { order_id: 1, event_name: 1 }, unique: true }],
  [C.adminAuditLogs]: [{ key: { created_at: -1 } }, { key: { target_id: 1 } }],
}

let client = null
let db = null

export async function connectDb(uri = env.MONGODB_URI, dbName = env.MONGODB_DB_NAME) {
  if (db) return db
  if (!uri) throw new Error('MONGODB_URI is not set. Add your MongoDB connection string (a replica set, e.g. MongoDB Atlas) to backend/.env.')
  client = new MongoClient(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10_000,
    retryWrites: true,
  })
  await client.connect()
  db = client.db(dbName)
  return db
}

export function getDb() {
  if (!db) throw new Error('Database is not connected.')
  return db
}

export function getClient() {
  if (!client) throw new Error('Database is not connected.')
  return client
}

export async function closeDb() {
  if (client) await client.close()
  client = null
  db = null
}

export async function ensureIndexes(database = getDb()) {
  for (const [name, specs] of Object.entries(INDEXES)) {
    const collection = database.collection(name)
    for (const { key, ...options } of specs) {
      await collection.createIndex(key, options)
    }
  }
}

/** True when the deployment supports multi-document transactions (replica set / sharded). */
export async function supportsTransactions(database = getDb()) {
  const hello = await database.admin().command({ hello: 1 })
  return Boolean(hello.setName || hello.msg === 'isdbgrid')
}

/**
 * Run `fn(session)` inside a transaction with retry on transient errors.
 * Every money/stock/status write that spans documents goes through here.
 */
export async function withTransaction(fn) {
  const session = getClient().startSession()
  try {
    let result
    await session.withTransaction(
      async () => {
        result = await fn(session)
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' },
    )
    return result
  } finally {
    await session.endSession()
  }
}

export async function pingDb() {
  try {
    await getDb().command({ ping: 1 })
    return true
  } catch (error) {
    logger.warn('Mongo ping failed', { error })
    return false
  }
}
