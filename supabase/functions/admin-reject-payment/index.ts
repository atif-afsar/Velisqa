import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { adminClient, user } = await requireAdmin(request)
    const { orderId, reason } = await request.json()
    if (!orderId || !String(reason || '').trim()) {
      return jsonResponse({ success: false, message: 'orderId and rejection reason are required.' }, 400)
    }

    const reviewedAt = new Date().toISOString()
    const { data: order, error: updateError } = await adminClient
      .from('orders')
      .update({
        payment_status: 'rejected',
        rejection_reason: String(reason).trim(),
        payment_reviewed_at: reviewedAt,
        payment_reviewed_by: user.id,
      })
      .eq('id', orderId)
      .eq('payment_status', 'payment_submitted')
      .select('id, order_ref')
      .maybeSingle()

    if (updateError) throw updateError
    if (!order) {
      return jsonResponse({ success: false, message: 'This payment is no longer awaiting review.' }, 409)
    }

    const { error: logError } = await adminClient.from('payment_review_logs').insert({
      order_id: order.id,
      action: 'rejected',
      admin_note: String(reason).trim(),
      reviewed_by: user.id,
    })
    if (logError) throw logError

    return jsonResponse({ success: true, orderRef: order.order_ref })
  } catch (error) {
    console.error('admin-reject-payment:', error)
    const message = error instanceof Error ? error.message : 'Payment rejection failed.'
    const status = message.includes('Admin access') || message.includes('Authentication') ? 403 : 500
    return jsonResponse({ success: false, message }, status)
  }
})
