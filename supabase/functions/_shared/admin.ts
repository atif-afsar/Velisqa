import { createClient } from 'npm:@supabase/supabase-js@2'

export function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase function secrets are incomplete.')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function requireAdmin(request: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase function secrets are incomplete.')
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) throw new Error('Authentication required.')

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) throw new Error('Authentication required.')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') throw new Error('Admin access required.')

  return { adminClient, user }
}
