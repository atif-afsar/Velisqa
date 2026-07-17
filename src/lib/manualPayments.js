import { supabase } from './supabaseClient'

const SCREENSHOT_BUCKET = 'payment-screenshots'
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const ACCEPTED_SCREENSHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] : data
}

export async function createManualPaymentOrder({ customer, items, paymentMethod = 'online' }) {
  const payloadItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    imageUrl: item.imageUrl || null,
  }))

  const { data, error } = await supabase.rpc('create_manual_payment_order', {
    p_customer: {
      ...customer,
      paymentMethod: paymentMethod === 'cod' ? 'cod' : 'online',
    },
    p_items: payloadItems,
  })

  if (error) {
    throw new Error(error.message || 'Could not create your order in Velisqa.')
  }

  const order = normalizeRpcRow(data)
  if (!order?.order_ref || !order?.access_token) {
    throw new Error('The order was created without a payment reference.')
  }

  return {
    orderRef: order.order_ref,
    accessToken: order.access_token,
    grandTotal: Number(order.grand_total) || 0,
  }
}

export async function getManualPaymentOrder(orderRef, accessToken) {
  if (!orderRef || !accessToken) throw new Error('This order link is incomplete.')

  const { data, error } = await supabase.rpc('get_manual_payment_order', {
    p_order_ref: orderRef,
    p_access_token: accessToken,
  })

  if (error) throw error
  if (!data) throw new Error('Order not found or this private link has expired.')
  return data
}

function validateScreenshot(file) {
  if (!file) throw new Error('Choose a payment screenshot.')
  if (!ACCEPTED_SCREENSHOT_TYPES.includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP screenshot.')
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error('The screenshot must be 5 MB or smaller.')
  }
}

function screenshotExtension(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export async function submitManualPaymentProof({
  order,
  accessToken,
  file,
  utr,
}) {
  validateScreenshot(file)

  const path = `${order.id}/${accessToken}/proof-${Date.now()}.${screenshotExtension(file)}`
  const { error: uploadError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await supabase.rpc('submit_manual_payment_proof', {
    p_order_ref: order.orderRef,
    p_access_token: accessToken,
    p_screenshot_path: path,
    p_utr: utr || null,
  })

  if (error || data !== true) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([path])
    throw error || new Error('Payment proof could not be attached to this order.')
  }

  return path
}

export async function getPaymentScreenshotSignedUrl(path, expiresIn = 600) {
  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export function orderPrivateUrl(path, orderRef, accessToken) {
  const query = new URLSearchParams({ token: accessToken })
  return `${path}/${encodeURIComponent(orderRef)}?${query.toString()}`
}

export function getManualPaymentConfig() {
  return {
    upiId: String(import.meta.env.VITE_UPI_ID || '').trim(),
    payeeName: String(import.meta.env.VITE_UPI_PAYEE_NAME || 'VELISQA').trim(),
    qrImageUrl: String(import.meta.env.VITE_UPI_QR_IMAGE_URL || '/payment-qr.png').trim(),
  }
}

export function buildUpiPaymentUrl({ upiId, payeeName, amount, orderRef }) {
  if (!upiId) return ''

  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || 'VELISQA',
    am: Number(amount).toFixed(2),
    cu: 'INR',
    tn: `Velisqa ${orderRef}`,
  })

  return `upi://pay?${params.toString()}`
}
