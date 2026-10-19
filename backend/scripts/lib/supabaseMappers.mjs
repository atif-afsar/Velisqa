/**
 * Pure row → document mappers for the Supabase (Postgres) → MongoDB import.
 * Every document keeps the original UUID as `_id` and the original timestamps,
 * order refs and provider IDs, so URLs, links and reconciliation stay stable.
 */
import { encryptOrderToken, hashOrderToken } from '../../src/lib/crypto.js'
import { normalizeRupees } from '../../src/lib/money.js'

const date = (value) => (value ? new Date(value) : null)
const money = (value) => (value == null || value === '' ? null : normalizeRupees(value))
const moneyOr0 = (value) => money(value) ?? 0
const array = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      // Postgres text[] literal: {a,b}
      return value.replace(/^\{|\}$/g, '').split(',').map((part) => part.replace(/^"|"$/g, '').trim()).filter(Boolean)
    }
  }
  return []
}
const str = (value) => (value == null ? null : String(value))

/** Mapping order matters: referenced collections first. */
export const TABLES = [
  'profiles',
  'products',
  'coupons',
  'orders',
  'order_items',
  'payments',
  'payment_events',
  'refunds',
  'order_status_history',
  'payment_review_logs',
  'product_reviews',
  'order_returns',
  'order_return_items',
  'creator_applications',
]

export function mapAuthUser(user, { passwordHash = null } = {}) {
  const google = (user.identities || []).find((identity) => identity.provider === 'google')
  const googleSub = google?.identity_data?.sub || google?.provider_id || null
  return {
    _id: String(user.id),
    email: String(user.email || '').trim().toLowerCase(),
    // Supabase stores bcrypt; the API verifies it and upgrades to scrypt on first login.
    password_hash: passwordHash || null,
    google_sub: googleSub ? String(googleSub) : null,
    email_verified: Boolean(user.email_confirmed_at || google),
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    disabled: Boolean(user.banned_until && new Date(user.banned_until) > new Date()),
    created_at: date(user.created_at),
    updated_at: date(user.updated_at) || date(user.created_at),
    last_sign_in_at: date(user.last_sign_in_at),
    migrated_from: 'supabase',
  }
}

const mappers = {
  profiles: (row) => ({
    _id: String(row.id),
    full_name: row.full_name ?? null,
    email: row.email ? String(row.email).toLowerCase() : null,
    role: row.role === 'admin' ? 'admin' : 'user',
    created_at: date(row.created_at),
  }),

  products: (row) => ({
    _id: String(row.id),
    name: row.name,
    price: moneyOr0(row.price),
    mrp: money(row.mrp),
    description: row.description ?? null,
    category: row.category ?? null,
    metal: row.metal ?? null,
    colour: row.colour ?? null,
    styles: array(row.styles),
    search_keywords: array(row.search_keywords),
    stock: Number.isFinite(Number(row.stock)) ? Math.trunc(Number(row.stock)) : 0,
    out_of_stock: Boolean(row.out_of_stock),
    badge: row.badge === 'bestseller' || row.badge === 'new' ? row.badge : null,
    image_url: row.image_url ?? null,
    hover_image_url: row.hover_image_url ?? null,
    gallery_urls: array(row.gallery_urls),
    cloudinary_public_id: row.cloudinary_public_id ?? null,
    hover_cloudinary_public_id: row.hover_cloudinary_public_id ?? null,
    gallery_cloudinary_ids: array(row.gallery_cloudinary_ids),
    mock_review_count: Number(row.mock_review_count) || 0,
    mock_rating: row.mock_rating == null ? null : Number(row.mock_rating),
    is_combo: Boolean(row.is_combo),
    combo_product_ids: array(row.combo_product_ids).map(String),
    // Recomputed from approved reviews after import (verify-migration --fix-aggregates).
    rating: row.rating == null ? null : Number(row.rating),
    review_count: Number(row.review_count) || 0,
    created_by: str(row.created_by),
    created_at: date(row.created_at),
    updated_at: date(row.updated_at) || date(row.created_at),
  }),

  coupons: (row) => ({
    _id: String(row.code).trim().toUpperCase(),
    discount_type: row.discount_type,
    discount_value: moneyOr0(row.discount_value),
    min_subtotal: moneyOr0(row.min_subtotal),
    active: Boolean(row.active),
    created_at: date(row.created_at),
  }),

  orders: (row) => {
    const token = row.order_access_token ? String(row.order_access_token) : null
    const cancelled = row.order_status === 'cancelled'
    const returned = row.order_status === 'returned'
    // Stock already left inventory for COD at checkout and for paid online orders (old trigger);
    // cancelled/returned orders had nothing outstanding to restore.
    const stockApplied = !cancelled && !returned && (row.payment_method === 'cod' || row.payment_status === 'paid')
    return {
      _id: String(row.id),
      order_ref: row.order_ref,
      user_id: str(row.user_id),
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      customer_email: row.customer_email ?? null,
      delivery_address: row.delivery_address,
      delivery_city: row.delivery_city ?? null,
      delivery_state: row.delivery_state ?? null,
      delivery_pincode: row.delivery_pincode,
      delivery_notes: row.delivery_notes ?? null,
      location_label: row.location_label ?? null,
      location_maps_url: row.location_maps_url ?? null,
      location_lat: row.location_lat ?? null,
      location_lng: row.location_lng ?? null,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      payment_gateway: row.payment_gateway ?? null,
      cashfree_order_id: row.cashfree_order_id ?? null,
      cashfree_payment_id: row.cashfree_payment_id ?? null,
      razorpay_order_id: row.razorpay_order_id ?? null,
      razorpay_payment_id: row.razorpay_payment_id ?? null,
      razorpay_signature: row.razorpay_signature ?? null,
      subtotal: moneyOr0(row.subtotal),
      delivery_charge: moneyOr0(row.delivery_charge),
      tax_amount: moneyOr0(row.tax_amount),
      discount_amount: moneyOr0(row.discount_amount),
      coupon_code: row.coupon_code ?? null,
      gift_wrap: Boolean(row.gift_wrap),
      gift_wrap_fee: moneyOr0(row.gift_wrap_fee),
      grand_total: moneyOr0(row.grand_total),
      order_status: row.order_status,
      shipping_status: row.shipping_status || 'not_shipped',
      nimbuspost_order_id: row.nimbuspost_order_id ?? null,
      nimbuspost_shipment_id: row.nimbuspost_shipment_id ?? null,
      nimbuspost_awb: row.nimbuspost_awb ?? null,
      courier_name: row.courier_name ?? null,
      tracking_url: row.tracking_url ?? null,
      is_enquiry: Boolean(row.is_enquiry),
      payment_screenshot_path: row.payment_screenshot_path ?? null,
      payment_utr: row.payment_utr ?? null,
      payment_submitted_at: date(row.payment_submitted_at),
      payment_reviewed_at: date(row.payment_reviewed_at),
      payment_reviewed_by: str(row.payment_reviewed_by),
      rejection_reason: row.rejection_reason ?? null,
      delivered_at: date(row.delivered_at),
      // Old private links (/orders/REF?token=UUID) keep working: same token, stored hashed + encrypted.
      access_token_hash: token ? hashOrderToken(token) : null,
      access_token_enc: token ? encryptOrderToken(token) : null,
      idempotency_key: null,
      idempotency_hash: null,
      stock_applied: stockApplied,
      deleted_at: null,
      created_at: date(row.created_at),
      updated_at: date(row.updated_at) || date(row.created_at),
    }
  },

  order_items: (row) => ({
    _id: String(row.id),
    order_id: String(row.order_id),
    product_id: str(row.product_id),
    product_name: row.product_name,
    product_url: row.product_url ?? null,
    image_url: row.image_url ?? null,
    unit_price: moneyOr0(row.unit_price),
    quantity: Number(row.quantity) || 1,
    line_total: moneyOr0(row.line_total),
    is_free_gift: Boolean(row.is_free_gift),
    created_at: date(row.created_at),
  }),

  payments: (row) => ({
    _id: String(row.id),
    order_id: String(row.order_id),
    provider: row.provider,
    provider_order_id: row.provider_order_id,
    provider_payment_id: row.provider_payment_id ?? null,
    amount: moneyOr0(row.amount),
    currency: row.currency || 'INR',
    status: row.status,
    method: row.method ?? null,
    email: row.email ?? null,
    contact: row.contact ?? null,
    signature_verified: Boolean(row.signature_verified),
    captured_at: date(row.captured_at),
    failed_at: date(row.failed_at),
    failure_code: row.failure_code ?? null,
    failure_description: row.failure_description ?? null,
    metadata: row.metadata ?? null,
    created_at: date(row.created_at),
    updated_at: date(row.updated_at) || date(row.created_at),
  }),

  payment_events: (row) => ({
    _id: String(row.id),
    provider: row.provider,
    event_id: String(row.event_id),
    event_type: row.event_type,
    payment_id: row.payment_id ?? null,
    order_id: row.order_id ?? null,
    payload: row.payload ?? null,
    signature_verified: Boolean(row.signature_verified),
    processed: Boolean(row.processed),
    processed_at: date(row.processed_at),
    created_at: date(row.created_at),
  }),

  refunds: (row) => ({
    _id: String(row.id),
    order_id: String(row.order_id),
    payment_id: str(row.payment_id),
    provider: row.provider,
    provider_refund_id: row.provider_refund_id,
    amount: moneyOr0(row.amount),
    status: row.status,
    reason: row.reason ?? null,
    initiated_at: date(row.initiated_at),
    processed_at: date(row.processed_at),
    metadata: row.metadata ?? null,
    created_at: date(row.created_at),
    updated_at: date(row.updated_at) || date(row.created_at),
  }),

  order_status_history: (row) => ({
    _id: String(row.id),
    order_id: String(row.order_id),
    old_status: row.old_status ?? null,
    new_status: row.new_status,
    changed_by: str(row.changed_by),
    source: row.source,
    reason: row.reason ?? null,
    metadata: row.metadata ?? null,
    created_at: date(row.created_at),
  }),

  payment_review_logs: (row) => ({
    _id: String(row.id),
    order_id: String(row.order_id),
    action: row.action,
    admin_note: row.admin_note ?? null,
    reviewed_by: str(row.reviewed_by),
    reviewed_at: date(row.reviewed_at),
  }),

  product_reviews: (row) => ({
    _id: String(row.id),
    product_id: String(row.product_id),
    user_id: String(row.user_id),
    order_id: String(row.order_id),
    rating: Number(row.rating),
    title: row.title,
    body: row.body,
    reviewer_name: row.reviewer_name,
    image_urls: array(row.image_urls),
    is_verified_purchase: row.is_verified_purchase !== false,
    status: row.status,
    created_at: date(row.created_at),
    updated_at: date(row.updated_at) || date(row.created_at),
  }),

  order_returns: (row) => ({
    _id: String(row.id),
    order_id: String(row.order_id),
    user_id: String(row.user_id),
    status: row.status,
    reason: row.reason,
    customer_notes: row.customer_notes ?? null,
    admin_notes: row.admin_notes ?? null,
    rejection_reason: row.rejection_reason ?? null,
    refund_amount: money(row.refund_amount),
    reverse_awb: row.reverse_awb ?? null,
    reverse_tracking_url: row.reverse_tracking_url ?? null,
    requested_at: date(row.requested_at),
    approved_at: date(row.approved_at),
    pickup_scheduled_at: date(row.pickup_scheduled_at),
    received_at: date(row.received_at),
    qc_completed_at: date(row.qc_completed_at),
    refunded_at: date(row.refunded_at),
    updated_at: date(row.updated_at) || date(row.requested_at),
  }),

  order_return_items: (row) => ({
    _id: String(row.id),
    return_id: String(row.return_id),
    order_item_id: String(row.order_item_id),
    quantity: Number(row.quantity) || 1,
    created_at: date(row.created_at),
  }),

  creator_applications: (row) => ({
    _id: String(row.id),
    user_id: str(row.user_id),
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    platform: row.platform,
    handle: row.handle,
    follower_count: Number(row.follower_count) || 0,
    tier: row.tier ?? null,
    niche: row.niche,
    portfolio_url: row.portfolio_url ?? null,
    message: row.message ?? null,
    status: row.status,
    created_at: date(row.created_at),
  }),
}

export function mapRow(table, row) {
  const mapper = mappers[table]
  if (!mapper) throw new Error(`No mapper for table ${table}`)
  return mapper(row)
}

/** Foreign keys to check after import: [collection, field, targetCollection]. */
export const REFERENCES = [
  ['orders', 'user_id', 'users'],
  ['order_items', 'order_id', 'orders'],
  ['order_items', 'product_id', 'products'],
  ['payments', 'order_id', 'orders'],
  ['refunds', 'order_id', 'orders'],
  ['order_status_history', 'order_id', 'orders'],
  ['payment_review_logs', 'order_id', 'orders'],
  ['product_reviews', 'product_id', 'products'],
  ['product_reviews', 'order_id', 'orders'],
  ['product_reviews', 'user_id', 'users'],
  ['order_returns', 'order_id', 'orders'],
  ['order_return_items', 'return_id', 'order_returns'],
  ['order_return_items', 'order_item_id', 'order_items'],
  ['profiles', '_id', 'users'],
]
