import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { agent, C, createUser, db, request, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

before(startTestServer)
after(stopTestServer)

describe('AUTH-01 email registration / login / logout / session', () => {
  test('register → login → me → logout, and the session survives across requests', async () => {
    const client = await agent()
    const reg = await client.post('/api/v1/auth/register').send({ email: 'New@Example.test', password: 'pass1234', fullName: 'New Person' })
    assert.equal(reg.status, 201)
    assert.equal(reg.body.data.user.email, 'new@example.test')

    const profile = await db().collection(C.profiles).findOne({ email: 'new@example.test' })
    assert.equal(profile.role, 'user', 'new accounts are never admin')

    const login = await client.post('/api/v1/auth/login').send({ email: 'new@example.test', password: 'pass1234' })
    assert.equal(login.status, 200)
    const cookie = login.headers['set-cookie'].find((value) => value.startsWith('velisqa.sid='))
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Lax/i)

    const me = await client.get('/api/v1/auth/me')
    assert.equal(me.body.data.user.email, 'new@example.test')
    assert.equal(me.body.data.user.user_metadata.full_name, 'New Person')
    assert.equal(me.body.data.profile.role, 'user')

    const logout = await client.post('/api/v1/auth/logout').send({})
    assert.equal(logout.status, 200)
    const meAfter = await client.get('/api/v1/auth/me')
    assert.equal(meAfter.body.data.user, null)
  })

  test('duplicate email and wrong password are rejected', async () => {
    const user = await createUser()
    const client = await agent()
    const dup = await client.post('/api/v1/auth/register').send({ email: user.email, password: 'whatever1' })
    assert.equal(dup.status, 409)
    const bad = await client.post('/api/v1/auth/login').send({ email: user.email, password: 'wrong-password' })
    assert.equal(bad.status, 401)
    assert.equal(bad.body.success, false)
  })

  test('role cannot be chosen at registration', async () => {
    const client = await agent()
    const res = await client.post('/api/v1/auth/register').send({ email: 'sneaky@example.test', password: 'pass1234', role: 'admin' })
    assert.equal(res.status, 201)
    const profile = await db().collection(C.profiles).findOne({ email: 'sneaky@example.test' })
    assert.equal(profile.role, 'user')
  })

  test('imported Supabase bcrypt hashes log in and are upgraded to scrypt', async () => {
    const { default: bcrypt } = await import('bcryptjs')
    const user = await createUser({ email: 'legacy@example.test' })
    await db().collection(C.users).updateOne({ _id: user.id }, { $set: { password_hash: await bcrypt.hash('legacyPass1', 10) } })
    const client = await agent()
    const res = await client.post('/api/v1/auth/login').send({ email: 'legacy@example.test', password: 'legacyPass1' })
    assert.equal(res.status, 200)
    const stored = await db().collection(C.users).findOne({ _id: user.id })
    assert.match(stored.password_hash, /^scrypt\$/)
  })

  test('password reset flow rotates the password and invalidates sessions', async () => {
    const { client, user } = await signedInAgent()
    const forgot = await client.post('/api/v1/auth/forgot-password').send({ email: user.email })
    assert.equal(forgot.status, 200)
    const unknown = await client.post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.test' })
    assert.equal(unknown.body.data.message, forgot.body.data.message, 'uniform response, no enumeration')

    const reset = await db().collection(C.passwordResets).findOne({ user_id: user.id })
    assert.ok(reset)
    // The raw token is only emailed; simulate the link by inserting a known token hash.
    const { sha256 } = await import('../../src/lib/crypto.js')
    await db().collection(C.passwordResets).updateOne({ _id: reset._id }, { $set: { token_hash: sha256('known-reset-token-value-123456') } })
    const done = await client.post('/api/v1/auth/reset-password').send({ token: 'known-reset-token-value-123456', password: 'brandNew99' })
    assert.equal(done.status, 200)
    assert.equal((await client.get('/api/v1/auth/me')).body.data.user, null, 'old sessions revoked')

    const fresh = await agent()
    assert.equal((await fresh.post('/api/v1/auth/login').send({ email: user.email, password: 'brandNew99' })).status, 200)
    const reuse = await fresh.post('/api/v1/auth/reset-password').send({ token: 'known-reset-token-value-123456', password: 'another99' })
    assert.equal(reuse.status, 400, 'reset tokens are single use')
  })
})

describe('AUTH-03 admin login and role enforcement', () => {
  test('adminOnly login refuses customers and admits admins', async () => {
    const customer = await createUser()
    const client = await agent()
    const denied = await client.post('/api/v1/auth/login').send({ email: customer.email, password: customer.password, adminOnly: true })
    assert.equal(denied.status, 403)
    assert.equal((await client.get('/api/v1/auth/me')).body.data.user, null, 'no session issued on denied admin login')

    const admin = await createUser({ role: 'admin' })
    const ok = await client.post('/api/v1/auth/login').send({ email: admin.email, password: admin.password, adminOnly: true })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.data.profile.role, 'admin')
  })

  test('every admin route rejects anonymous (401) and customers (403)', async () => {
    const anon = await agent()
    const { client: customerClient } = await signedInAgent()
    const routes = [
      ['get', '/api/v1/admin/inbox'],
      ['get', '/api/v1/admin/products'],
      ['post', '/api/v1/admin/products'],
      ['patch', '/api/v1/admin/products/x'],
      ['delete', '/api/v1/admin/products/x'],
      ['get', '/api/v1/admin/orders'],
      ['post', '/api/v1/admin/orders/x/ship'],
      ['post', '/api/v1/admin/orders/x/cancel'],
      ['post', '/api/v1/admin/orders/x/reset-shipment'],
      ['delete', '/api/v1/admin/orders/x'],
      ['get', '/api/v1/admin/payments'],
      ['post', '/api/v1/admin/payments/x/approve'],
      ['post', '/api/v1/admin/payments/x/reject'],
      ['get', '/api/v1/admin/coupons'],
      ['post', '/api/v1/admin/coupons'],
      ['patch', '/api/v1/admin/coupons/X'],
      ['delete', '/api/v1/admin/coupons/X'],
      ['get', '/api/v1/admin/reviews'],
      ['patch', '/api/v1/admin/reviews/x'],
      ['get', '/api/v1/admin/returns'],
      ['post', '/api/v1/admin/returns/x/actions'],
      ['get', '/api/v1/admin/analytics/orders?start=2020-01-01&end=2030-01-01'],
      ['get', '/api/v1/admin/audit'],
    ]
    for (const [method, url] of routes) {
      const a = await anon[method](url).send?.({}) ?? (await anon[method](url))
      assert.equal(a.status, 401, `${method.toUpperCase()} ${url} anon`)
      const c = await customerClient[method](url).send?.({}) ?? (await customerClient[method](url))
      assert.equal(c.status, 403, `${method.toUpperCase()} ${url} customer`)
    }
  })
})

describe('Security middleware', () => {
  test('state-changing requests without a CSRF token are refused', async () => {
    const res = await request().post('/api/v1/auth/login').set('Origin', 'http://localhost:5173').send({ email: 'a@b.test', password: 'x' })
    assert.equal(res.status, 403)
    assert.equal(res.body.error.code, 'CSRF_FAILED')
  })

  test('foreign origins are refused even with a token', async () => {
    const client = await agent()
    const res = await client.raw.post('/api/v1/auth/login').set('Origin', 'https://evil.example').set('X-CSRF-Token', client.csrf).send({ email: 'a@b.test', password: 'x' })
    assert.equal(res.status, 403)
    assert.equal(res.body.error.code, 'BAD_ORIGIN')
  })

  test('Mongo operator injection is rejected', async () => {
    const client = await agent()
    const res = await client.post('/api/v1/auth/login').send({ email: { $ne: null }, password: { $ne: null } })
    assert.equal(res.status, 400)
  })

  test('CORS only reflects allow-listed origins', async () => {
    const okRes = await request().get('/api/v1/products').set('Origin', 'http://localhost:5173')
    assert.equal(okRes.headers['access-control-allow-origin'], 'http://localhost:5173')
    assert.equal(okRes.headers['access-control-allow-credentials'], 'true')
    const bad = await request().get('/api/v1/products').set('Origin', 'https://evil.example')
    assert.equal(bad.headers['access-control-allow-origin'], undefined)
  })

  test('health and readiness report a transactional database', async () => {
    assert.equal((await request().get('/health')).status, 200)
    const ready = await request().get('/api/v1/health/ready')
    assert.equal(ready.status, 200)
    assert.deepEqual(ready.body.data, { database: true, transactions: true })
  })
})

describe('AUTH-02 Google OAuth redirect safety', () => {
  test('unconfigured Google returns the user to /auth/callback with a friendly error', async () => {
    const res = await request().get('/api/v1/auth/google?next=/checkout')
    assert.equal(res.status, 302)
    assert.match(res.headers.location, /^http:\/\/localhost:5173\/auth\/callback\?error_description=/)
  })

  test('callback without a valid signed state is rejected (login CSRF)', async () => {
    const res = await request().get('/api/v1/auth/google/callback?code=abc&state=forged')
    assert.equal(res.status, 302)
    assert.match(new URL(res.headers.location).searchParams.get('error_description'), /could not be verified/)
  })

  test('safeRelativePath rejects open redirects', async () => {
    const { safeRelativePath } = await import('../../src/lib/safeRedirect.js')
    assert.equal(safeRelativePath('/checkout?checkout=1'), '/checkout?checkout=1')
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '', null]) {
      assert.equal(safeRelativePath(bad), '/', String(bad))
    }
  })
})
