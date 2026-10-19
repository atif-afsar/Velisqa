/**
 * Integration harness: a real mongod (single-node replica set, so transactions
 * work exactly as in production) started by mongodb-memory-server, plus the
 * real Express app. Nothing here is mocked except outbound provider HTTP.
 */
process.env.NODE_ENV = 'test'
process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret'
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_webhook_secret'
process.env.NIMBUSPOST_WEBHOOK_SECRET = 'nimbus_webhook_secret'
process.env.NIMBUSPOST_AUTO_SHIP = 'false'
process.env.NIMBUSPOST_API_KEY = 'nimbus_key'
process.env.NIMBUSPOST_API_SECRET = 'nimbus_secret'
process.env.NIMBUSPOST_WAREHOUSE_ID = '12345'
process.env.MEDIA_DIR = (await import('node:fs')).mkdtempSync((await import('node:path')).join((await import('node:os')).tmpdir(), 'velisqa-media-'))
process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud'
process.env.CLOUDINARY_API_KEY = 'cloud_key'
process.env.CLOUDINARY_API_SECRET = 'cloud_secret'

const { MongoMemoryReplSet } = await import('mongodb-memory-server')
const supertest = (await import('supertest')).default
const { connectDb, closeDb, ensureIndexes, getDb, C } = await import('../../src/config/db.js')
const { createApp } = await import('../../src/app.js')
const { hashPassword, uuid } = await import('../../src/lib/crypto.js')

let replSet = null
let app = null
let dbName = null

export async function startTestServer() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
  dbName = `velisqa_test_${Date.now()}`
  await connectDb(replSet.getUri(), dbName)
  await ensureIndexes()
  app = createApp()
  return app
}

export async function stopTestServer() {
  await closeDb()
  if (replSet) await replSet.stop()
}

export const db = () => getDb()
export const mongoTarget = () => ({ uri: replSet.getUri(), dbName })
export { C }

/** A cookie-jar agent that already holds a CSRF token, like the browser apiClient. */
export async function agent() {
  const client = supertest.agent(app)
  const res = await client.get('/api/v1/auth/csrf').set('Origin', 'http://localhost:5173')
  const csrf = res.body.data.csrfToken
  const wrap = (method) => (url) => client[method](url).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrf)
  return {
    raw: client,
    csrf,
    get: (url) => client.get(url).set('Origin', 'http://localhost:5173'),
    post: wrap('post'),
    patch: wrap('patch'),
    put: wrap('put'),
    delete: wrap('delete'),
  }
}

export const request = () => supertest(app)

export async function createUser({ email = `user-${uuid()}@example.test`, password = 'secret123', role = 'user', fullName = 'Test User' } = {}) {
  const id = uuid()
  const now = new Date()
  await getDb().collection(C.users).insertOne({ _id: id, email, password_hash: await hashPassword(password), google_sub: null, email_verified: true, full_name: fullName, disabled: false, created_at: now, updated_at: now })
  await getDb().collection(C.profiles).insertOne({ _id: id, full_name: fullName, email, role, created_at: now })
  return { id, email, password }
}

export async function signedInAgent(options) {
  const user = await createUser(options)
  const client = await agent()
  const res = await client.post('/api/v1/auth/login').send({ email: user.email, password: user.password })
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { client, user }
}

export async function createProduct(overrides = {}) {
  const now = new Date()
  const doc = {
    _id: uuid(),
    name: 'Test Necklace',
    price: 500,
    mrp: 800,
    description: 'A test product',
    category: 'necklaces',
    metal: 'Gold plated',
    colour: 'Gold',
    styles: ['Everyday'],
    search_keywords: ['chain'],
    stock: 10,
    out_of_stock: false,
    badge: null,
    image_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/velisqa/products/a.jpg',
    hover_image_url: null,
    gallery_urls: [],
    cloudinary_public_id: null,
    hover_cloudinary_public_id: null,
    gallery_cloudinary_ids: [],
    mock_review_count: 0,
    mock_rating: null,
    is_combo: false,
    combo_product_ids: [],
    rating: null,
    review_count: 0,
    created_by: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
  await getDb().collection(C.products).insertOne(doc)
  return doc
}

export const customer = (overrides = {}) => ({
  name: 'Asha Verma',
  phone: '9876543210',
  email: 'asha@example.test',
  address: '12 MG Road',
  city: 'Aligarh',
  state: 'Uttar Pradesh',
  pincode: '202001',
  paymentMethod: 'cod',
  giftWrap: false,
  ...overrides,
})

export async function placeOrder(client, { items, customer: cust = customer(), idempotencyKey } = {}) {
  return client.post('/api/v1/orders').send({ customer: cust, items, ...(idempotencyKey ? { idempotencyKey } : {}) })
}
