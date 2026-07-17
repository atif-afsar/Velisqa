import { supabase } from './supabaseClient'

async function readFunctionErrorMessage(error, data) {
  if (data?.message) return data.message

  if (error?.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.json()
      if (payload?.message) return payload.message
      if (typeof payload?.error === 'string') return payload.error
    } catch {
      /* ignore malformed error bodies */
    }
  }

  return error?.message || 'Request failed.'
}

export async function invokeEdgeFunction(functionName, body) {
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  const message = await readFunctionErrorMessage(error, data)

  if (error || !data?.success) {
    return { data, error: message }
  }

  return { data, error: null }
}
