import { createUserSupabaseClient } from '../lib/supabase.js'
import { loadReference } from '../lib/reference.js'
import { searchResearch } from '../lib/search.js'

const accessToken = process.env.MCP_ACCESS_TOKEN
const referenceId = process.env.MCP_EXPECT_REFERENCE_ID ||
  process.env.MCP_EXPECT_RESULT_ID
const query = process.env.MCP_SEARCH_QUERY

if (!accessToken || !referenceId || !query) {
  console.log(
    'NOT RUN: missing MCP_ACCESS_TOKEN, MCP_EXPECT_REFERENCE_ID, or ' +
    'MCP_SEARCH_QUERY'
  )
  process.exitCode = 2
} else {
  try {
    const supabase = createUserSupabaseClient(accessToken)
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      console.log('FAIL: token_rejected_by_mcp_supabase')
      process.exitCode = 1
    } else {
      const reference = await loadReference(supabase, referenceId)

      if (!reference) {
        console.log('FAIL: fixture_reference_not_accessible')
        process.exitCode = 1
      } else {
        const results = await searchResearch(supabase, query, 20)
        const found = results.some((result) => result.reference_id === referenceId)

        if (!found) {
          console.log('FAIL: fixture_query_did_not_return_expected_reference')
          process.exitCode = 1
        } else {
          console.log('PASS: authenticated_fixture_confirmed')
          console.log(`MCP_EXPECT_REFERENCE_TITLE=${reference.reference.title}`)
        }
      }
    }
  } catch {
    console.log('FAIL: fixture_inspection_error')
    process.exitCode = 1
  }
}
