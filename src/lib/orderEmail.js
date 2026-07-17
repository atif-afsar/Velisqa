import { CONTACT_EMAIL } from '../Components/SEO/siteConfig'
import { CHECKOUT_DELIVERY_CHARGE, getCartTotal, getCheckoutGrandTotal } from './cartStock'

function formatInrLine(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

function generateOrderRef() {
  return `VLQ-${Date.now().toString(36).toUpperCase()}`
}

function buildSingleOrderBody({
  orderRef,
  productName,
  productUrl,
  paymentMethod,
  customer,
  enquiryType = 'order',
}) {
  const isEnquiry = enquiryType === 'enquiry'
  const paymentLabel = paymentMethod === 'online' ? 'Manual UPI QR payment' : 'Cash on delivery'

  const lines = [
    isEnquiry ? 'VELISQA — SOLD OUT / REGISTER INTEREST' : 'VELISQA — NEW ORDER',
    `Order reference: ${orderRef}`,
    `Received: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}`,
    '',
    '--- PRODUCT ---',
    productName || 'Not specified',
    productUrl ? `Page: ${productUrl}` : null,
    '',
    '--- PAYMENT ---',
    paymentLabel,
    '',
    '--- CUSTOMER ---',
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    customer.email ? `Email: ${customer.email}` : null,
    '',
    '--- DELIVERY ADDRESS ---',
    customer.address,
    customer.city ? `City: ${customer.city}` : null,
    customer.pincode ? `PIN: ${customer.pincode}` : null,
    '',
    customer.locationMapsUrl
      ? `GPS: ${customer.locationLabel || 'Shared via GPS'}\n${customer.locationMapsUrl}`
      : customer.locationLabel
        ? `Location note: ${customer.locationLabel}`
        : null,
    customer.notes ? `\nNotes: ${customer.notes}` : null,
    '',
    isEnquiry
      ? 'Customer is interested in a sold-out / made-to-order piece. Please confirm availability and timeline.'
      : 'Please confirm stock, final bill, and delivery timeline.',
  ].filter(Boolean)

  return lines.join('\n')
}

function buildCartOrderBody({ orderRef, cartItems, stockWarnings, paymentMethod, customer }) {
  const orderTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

  let productsSubtotal = 0
  let totalPieces = 0

  const itemLines = cartItems.map((item, index) => {
    const unit = Number(item.price) || 0
    const qty = Number(item.quantity) || 0
    const lineTotal = unit * qty
    productsSubtotal += lineTotal
    totalPieces += qty

    return [
      `${index + 1}. ${item.name}`,
      `   Qty: ${qty} × ${formatInrLine(unit)} = ${formatInrLine(lineTotal)}`,
      item.productUrl || item.productId ? `   Link: ${item.productUrl || `/product/${item.productId}`}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  })

  const paymentLabel = paymentMethod === 'online' ? 'Manual UPI QR payment' : 'Cash on delivery'

  const lines = [
    'VELISQA — CART ORDER (Website)',
    `Order reference: ${orderRef}`,
    `Received: ${orderTime}`,
    '',
    '--- ORDER SUMMARY ---',
    `Products: ${cartItems.length} · Total pieces: ${totalPieces}`,
    `Subtotal: ${formatInrLine(productsSubtotal)}`,
    `Delivery: ${CHECKOUT_DELIVERY_CHARGE <= 0 ? 'FREE (₹0)' : formatInrLine(CHECKOUT_DELIVERY_CHARGE)}`,
    `Grand total: ${formatInrLine(getCheckoutGrandTotal(productsSubtotal))}`,
    `Payment: ${paymentLabel}`,
    '',
    ...itemLines,
    '',
    stockWarnings.length > 0 ? '--- STOCK NOTES ---' : null,
    ...stockWarnings.map((w) => `• ${w}`),
    stockWarnings.length > 0 ? '' : null,
    '--- DELIVER TO ---',
    `Customer: ${customer.name}`,
    `Phone: ${customer.phone}`,
    customer.email ? `Email: ${customer.email}` : null,
    '',
    `Address:\n${customer.address}`,
    [customer.city, customer.pincode].filter(Boolean).length
      ? `City / PIN: ${[customer.city, customer.pincode].filter(Boolean).join(' · ')}`
      : null,
    '',
    customer.locationMapsUrl
      ? `GPS: ${customer.locationLabel || 'Customer shared location'}\n${customer.locationMapsUrl}`
      : customer.locationLabel
        ? `Location note: ${customer.locationLabel}`
        : null,
    customer.notes ? `\nCustomer notes: ${customer.notes}` : null,
    '',
    'Please confirm stock, final bill, and delivery time.',
  ]

  return lines.filter((line) => line !== null).join('\n')
}

export function buildOrderEmailPayload({
  productName,
  productUrl,
  cartItems,
  stockWarnings = [],
  paymentMethod = 'cod',
  customer,
  enquiryType = 'order',
}) {
  const orderRef = generateOrderRef()
  const isCart = Array.isArray(cartItems) && cartItems.length > 0
  const isEnquiry = enquiryType === 'enquiry'

  const subject = isCart
    ? `Velisqa Cart Order ${orderRef} — ${customer.name}`
    : isEnquiry
      ? `Velisqa Enquiry ${orderRef} — ${productName || 'Product'}`
      : `Velisqa Order ${orderRef} — ${productName || 'Product'}`

  const message = isCart
    ? buildCartOrderBody({ orderRef, cartItems, stockWarnings, paymentMethod, customer })
    : buildSingleOrderBody({
        orderRef,
        productName,
        productUrl,
        paymentMethod,
        customer,
        enquiryType,
      })

  const total = isCart ? getCartTotal(cartItems) : null

  return {
    orderRef,
    subject,
    message,
    summary: {
      orderRef,
      productName: isCart ? `${cartItems.length} items` : productName,
      total,
      paymentMethod,
      customerName: customer.name,
    },
  }
}

const ORDER_INBOX = CONTACT_EMAIL

function isFormSubmitSuccess(data) {
  if (!data || typeof data !== 'object') return false
  return data.success === true || data.success === 'true'
}

const FORM_SUBMIT_TIMEOUT_MS = 20000

export async function submitOrderEmail(payload) {
  const customer = payload.customer || {}

  const body = new FormData()
  body.append('name', customer.name || 'Velisqa Customer')
  body.append('email', customer.email || ORDER_INBOX)
  body.append('phone', customer.phone || '')
  body.append('order_ref', payload.orderRef || '')
  body.append('message', payload.message || '')
  body.append('_subject', payload.subject || 'Velisqa order')
  body.append('_replyto', customer.email || ORDER_INBOX)
  body.append('_template', 'table')
  body.append('_captcha', 'false')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FORM_SUBMIT_TIMEOUT_MS)

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(ORDER_INBOX)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
      signal: controller.signal,
    })

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok || !isFormSubmitSuccess(data)) {
      return {
        ok: false,
        error:
          (data && typeof data.message === 'string' && data.message) ||
          'Could not email our team about your enquiry. Please try again or message us on WhatsApp.',
      }
    }

    return { ok: true, orderRef: payload.orderRef }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        error: 'Order email timed out. Please try again in a moment, or use UPI QR payment.',
      }
    }
    return {
      ok: false,
      error: 'Network error — please check your connection and try again.',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
