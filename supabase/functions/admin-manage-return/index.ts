import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'

const ACTIVE_RETURN_STATUSES = [
  'pending',
  'approved',
  'pickup_scheduled',
  'in_transit',
  'received',
  'qc_passed',
  'qc_failed',
]

async function loadReturn(adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'], returnId: string) {
  const { data, error } = await adminClient
    .from('order_returns')
    .select(`
      *,
      orders (
        id,
        order_ref,
        grand_total,
        payment_status,
        payment_method,
        customer_name,
        customer_phone,
        order_status,
        shipping_status
      ),
      order_return_items (
        id,
        quantity,
        order_item_id,
        order_items (
          product_id,
          product_name,
          quantity
        )
      )
    `)
    .eq('id', returnId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Return request not found.')
  return data
}

async function restoreStockForReturn(adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'], returnId: string) {
  const { data: lines, error } = await adminClient
    .from('order_return_items')
    .select(`
      quantity,
      order_items (product_id)
    `)
    .eq('return_id', returnId)

  if (error) throw error

  for (const line of lines || []) {
    const productId = line.order_items?.product_id
    if (!productId) continue

    const { data: product, error: productError } = await adminClient
      .from('products')
      .select('stock, out_of_stock')
      .eq('id', productId)
      .maybeSingle()

    if (productError) throw productError
    if (!product) continue

    const nextStock = Number(product.stock || 0) + Number(line.quantity || 0)
    const { error: updateError } = await adminClient
      .from('products')
      .update({
        stock: nextStock,
        out_of_stock: false,
      })
      .eq('id', productId)

    if (updateError) throw updateError
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { adminClient } = await requireAdmin(request)
    const body = await request.json()
    const action = String(body.action || '')

    if (action === 'list') {
      const status = String(body.status || 'pending')
      let query = adminClient
        .from('order_returns')
        .select(`
          id,
          order_id,
          status,
          reason,
          customer_notes,
          rejection_reason,
          refund_amount,
          reverse_awb,
          reverse_tracking_url,
          requested_at,
          approved_at,
          refunded_at,
          orders (
            order_ref,
            customer_name,
            customer_phone,
            grand_total,
            payment_status,
            payment_method
          )
        `)
        .order('requested_at', { ascending: status === 'pending' })

      if (status === 'pending') {
        query = query.eq('status', 'pending')
      } else if (status === 'active') {
        query = query.in('status', ['approved', 'pickup_scheduled', 'in_transit', 'received', 'qc_passed', 'qc_failed'])
      } else if (status === 'completed') {
        query = query.in('status', ['refunded', 'rejected', 'cancelled'])
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return jsonResponse({ success: true, returns: data || [] })
    }

    const returnId = String(body.returnId || '')
    if (!returnId) return jsonResponse({ success: false, message: 'Return id is required.' }, 400)

    const row = await loadReturn(adminClient, returnId)
    const order = row.orders as Record<string, unknown> | null
    const now = new Date().toISOString()

    if (action === 'approve') {
      if (row.status !== 'pending') {
        return jsonResponse({ success: false, message: 'Only pending returns can be approved.' }, 409)
      }
      const { error } = await adminClient
        .from('order_returns')
        .update({ status: 'approved', approved_at: now, admin_notes: body.adminNotes || row.admin_notes })
        .eq('id', returnId)
      if (error) throw error
      return jsonResponse({ success: true, message: 'Return approved. Book reverse pickup next.' })
    }

    if (action === 'reject') {
      const rejectionReason = String(body.rejectionReason || '').trim()
      if (!rejectionReason) {
        return jsonResponse({ success: false, message: 'Add a rejection reason for the customer.' }, 400)
      }
      const { error } = await adminClient
        .from('order_returns')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          admin_notes: body.adminNotes || row.admin_notes,
        })
        .eq('id', returnId)
      if (error) throw error
      return jsonResponse({ success: true, message: 'Return rejected.' })
    }

    if (action === 'set_reverse_awb') {
      const reverseAwb = String(body.reverseAwb || '').trim()
      if (!reverseAwb) {
        return jsonResponse({ success: false, message: 'Reverse AWB is required.' }, 400)
      }
      if (!['approved', 'pickup_scheduled', 'in_transit'].includes(row.status)) {
        return jsonResponse({ success: false, message: 'Approve the return before booking pickup.' }, 409)
      }
      const { error } = await adminClient
        .from('order_returns')
        .update({
          status: 'pickup_scheduled',
          reverse_awb: reverseAwb,
          reverse_tracking_url: body.reverseTrackingUrl ? String(body.reverseTrackingUrl) : row.reverse_tracking_url,
          pickup_scheduled_at: row.pickup_scheduled_at || now,
        })
        .eq('id', returnId)
      if (error) throw error
      return jsonResponse({ success: true, message: 'Reverse pickup details saved.' })
    }

    if (action === 'mark_received') {
      if (!ACTIVE_RETURN_STATUSES.includes(row.status) || row.status === 'pending') {
        return jsonResponse({ success: false, message: 'Return is not in transit yet.' }, 409)
      }
      const { error } = await adminClient
        .from('order_returns')
        .update({ status: 'received', received_at: now })
        .eq('id', returnId)
      if (error) throw error
      return jsonResponse({ success: true, message: 'Return marked received at warehouse.' })
    }

    if (action === 'qc_pass') {
      if (row.status !== 'received' && row.status !== 'qc_failed') {
        return jsonResponse({ success: false, message: 'Mark the return received before QC.' }, 409)
      }
      await restoreStockForReturn(adminClient, returnId)
      const { error } = await adminClient
        .from('order_returns')
        .update({ status: 'qc_passed', qc_completed_at: now })
        .eq('id', returnId)
      if (error) throw error
      return jsonResponse({ success: true, message: 'QC passed. Inventory restored. Mark refunded when payment is sent.' })
    }

    if (action === 'qc_fail') {
      if (row.status !== 'received') {
        return jsonResponse({ success: false, message: 'Mark the return received before QC.' }, 409)
      }
      const { error } = await adminClient
        .from('order_returns')
        .update({ status: 'qc_failed', qc_completed_at: now })
        .eq('id', returnId)
      if (error) throw error
      return jsonResponse({ success: true, message: 'QC failed. Handle refund manually per policy.' })
    }

    if (action === 'mark_refunded') {
      if (row.status !== 'qc_passed') {
        return jsonResponse({ success: false, message: 'Complete QC pass before marking refunded.' }, 409)
      }

      const orderId = row.order_id as string
      const paymentStatus = order?.payment_status as string | undefined

      const orderPatch: Record<string, string> = {
        order_status: 'returned',
      }
      if (paymentStatus === 'paid') {
        orderPatch.payment_status = 'refunded'
      }

      const { error: orderError } = await adminClient.from('orders').update(orderPatch).eq('id', orderId)
      if (orderError) throw orderError

      const { error } = await adminClient
        .from('order_returns')
        .update({ status: 'refunded', refunded_at: now })
        .eq('id', returnId)
      if (error) throw error

      return jsonResponse({
        success: true,
        message: paymentStatus === 'paid'
          ? 'Return closed and order marked refunded.'
          : 'Return closed. Process COD refund manually if applicable.',
      })
    }

    return jsonResponse({ success: false, message: 'Unknown action.' }, 400)
  } catch (error) {
    console.error('admin-manage-return:', error)
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : 'Return action failed.',
    }, 500)
  }
})
