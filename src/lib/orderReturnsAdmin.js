import { invokeEdgeFunction } from './invokeEdgeFunction'

export async function fetchAdminOrderReturns(status = 'pending') {
  const { data, error } = await invokeEdgeFunction('admin-manage-return', {
    action: 'list',
    status,
  })
  if (error) throw new Error(error)
  return data?.returns || []
}

export async function adminManageReturn(payload) {
  const { data, error } = await invokeEdgeFunction('admin-manage-return', payload)
  if (error) throw new Error(error)
  return data
}
