import { api } from './apiClient'

export async function fetchAdminOrderReturns(status = 'pending') {
  const data = await api.get('/admin/returns', { query: { status } })
  return data.returns || []
}

/** `{ returnId, action, ... }` — approve / reject / set_reverse_awb / mark_received / qc_pass / qc_fail / mark_refunded. */
export async function adminManageReturn({ returnId, ...payload }) {
  return api.post(`/admin/returns/${encodeURIComponent(returnId)}/actions`, payload)
}
