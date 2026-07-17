import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { fetchNimbusPostTracking } from '../_shared/nimbuspost.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed.' }, 405)

  try {
    const { orderRef, accessToken } = await request.json()
    if (!orderRef || !accessToken) {
      return jsonResponse({ success: false, message: 'This order link is incomplete.' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) throw new Error('Supabase function secrets are incomplete.')

    const adminClient = createClient(url, serviceKey)
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('order_ref, nimbuspost_awb, shipping_status, order_status, courier_name')
      .eq('order_ref', String(orderRef))
      .eq('order_access_token', String(accessToken))
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return jsonResponse({ success: false, message: 'Order not found.' }, 404)

    if (!order.nimbuspost_awb) {
      return jsonResponse({
        success: true,
        tracking: { scans: [], latest: null, message: 'Tracking will appear after the parcel is shipped.' },
      })
    }

    const tracking = await fetchNimbusPostTracking(order.nimbuspost_awb)

    return jsonResponse({
      success: true,
      tracking: {
        awb: order.nimbuspost_awb,
        courierName: order.courier_name,
        shippingStatus: order.shipping_status,
        ...tracking,
      },
    })
  } catch (error) {
    console.error('order-live-tracking:', error)
    const message = error instanceof Error ? error.message : 'Could not load live tracking.'
    return jsonResponse({ success: false, message }, 500)
  }
})
