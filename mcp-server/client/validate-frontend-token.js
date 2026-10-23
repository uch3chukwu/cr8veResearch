import { readFile } from 'node:fs/promises'

import { createClient } from '@supabase/supabase-js'

function parseEnvironment(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const separator = line.indexOf('=')
        return [line.slice(0, separator), line.slice(separator + 1)]
      })
  )
}

const accessToken = process.env.MCP_ACCESS_TOKEN

if (!accessToken) {
  console.log('NOT RUN: missing_mcp_access_token')
  process.exitCode = 2
} else {
  let environment

  try {
    environment = parseEnvironment(await readFile('../.env.local', 'utf8'))
  } catch {
    console.log('NOT RUN: frontend_configuration_unavailable')
    process.exitCode = 2
  }

  if (process.exitCode !== 2) {
    const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey } = environment

    if (!url || !anonKey) {
      console.log('NOT RUN: frontend_supabase_configuration_missing')
      process.exitCode = 2
    } else {
      try {
        const supabase = createClient(url, anonKey, {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false
          }
        })
        const { data, error } = await supabase.auth.getUser(accessToken)

        if (!error && data.user) {
          console.log('PASS: token_valid_for_frontend_supabase')
        } else if (error?.status === 401 || error?.status === 403) {
          console.log('FAIL: token_rejected_by_frontend_supabase')
          process.exitCode = 1
        } else {
          console.log('FAIL: frontend_supabase_auth_error')
          process.exitCode = 1
        }
      } catch {
        console.log('FAIL: frontend_supabase_validation_exception')
        process.exitCode = 1
      }
    }
  }
}
