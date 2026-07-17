import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'

const PAYMENT_SCREENSHOT_BUCKET = 'payment-screenshots'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { adminClient } = await requireAdmin(request)
    const { orderId } = await request.json()
    if (!orderId) return jsonResponse({ success: false, message: 'orderId is required.' }, 400)

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, order_ref, nimbuspost_awb, payment_screenshot_path, is_enquiry')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return jsonResponse({ success: false, message: 'Order not found.' }, 404)
    if (order.is_enquiry) {
      return jsonResponse({ success: false, message: 'Product enquiries cannot be removed here.' }, 409)
    }

    if (order.payment_screenshot_path) {
      const { error: storageError } = await adminClient.storage
        .from(PAYMENT_SCREENSHOT_BUCKET)
        .remove([order.payment_screenshot_path])
      if (storageError) {
        console.error('admin-delete-order: payment proof cleanup failed:', storageError)
      }
    }

    const { data: deletedRows, error: deleteError } = await adminClient
      .from('orders')
      .delete()
      .eq('id', order.id)
      .select('id, order_ref')

    if (deleteError) throw deleteError
    if (!deletedRows?.length) {
      return jsonResponse({ success: false, message: 'Order could not be removed.' }, 500)
    }

    return jsonResponse({
      success: true,
      orderRef: order.order_ref,
      hadAwb: Boolean(order.nimbuspost_awb),
    })
  } catch (error) {
    console.error('admin-delete-order:', error)
    const message = error instanceof Error ? error.message : 'Order removal failed.'
    const status = message.includes('Admin access') || message.includes('Authentication') ? 403 : 500
    return jsonResponse({ success: false, message }, status)
  }
})
