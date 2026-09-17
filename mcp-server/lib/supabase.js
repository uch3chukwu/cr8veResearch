import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env

if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: SUPABASE_URL')
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variable: SUPABASE_ANON_KEY')
}

export function createUserSupabaseClient(accessToken) {
  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new Error('A Supabase user access token is required')
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  })
}
