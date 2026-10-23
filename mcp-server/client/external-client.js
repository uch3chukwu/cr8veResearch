import assert from 'node:assert/strict'

import {
  Client,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client'

const endpoint = process.env.MCP_URL || 'http://127.0.0.1:3001/mcp'
const accessToken = process.env.MCP_ACCESS_TOKEN
const searchQuery = process.env.MCP_SEARCH_QUERY
const expectedReferenceId = process.env.MCP_EXPECT_REFERENCE_ID ||
  process.env.MCP_EXPECT_RESULT_ID
const expectedReferenceTitle = process.env.MCP_EXPECT_REFERENCE_TITLE
const minimumProtocolVersion = '2025-11-25'
const diagnosticsEnabled = process.env.MCP_DIAGNOSTICS === '1'

function logConnectionDiagnostics(stage, error, details = {}) {
  if (diagnosticsEnabled) {
    console.error('Safe MCP verification diagnostics:', {
      stage,
      errorName: error?.name ?? 'UnknownError',
      unauthorized: error?.name === 'UnauthorizedError',
      ...details
    })
  }
}

if (
  !accessToken ||
  !searchQuery ||
  !expectedReferenceId ||
  !expectedReferenceTitle
) {
  console.error(
    'Live test NOT RUN. Required variables: MCP_ACCESS_TOKEN, ' +
    'MCP_SEARCH_QUERY, MCP_EXPECT_REFERENCE_ID, and ' +
    'MCP_EXPECT_REFERENCE_TITLE. Values are never printed.'
  )
  process.exitCode = 2
} else {
  const client = new Client({
    name: 'cr8ve-research-external-client',
    version: '1.0.0'
  })
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    authProvider: { token: async () => accessToken }
  })

  let connected = false
  let stage = 'initialize'
  let searchDiagnostics = {}

  try {
    await client.connect(transport)
    connected = true
    stage = 'protocol_negotiation'
    const negotiatedProtocolVersion = client.getNegotiatedProtocolVersion()
    assert.match(
      negotiatedProtocolVersion ?? '',
      /^\d{4}-\d{2}-\d{2}$/,
      'Server did not negotiate a dated MCP protocol version'
    )
    assert(
      negotiatedProtocolVersion >= minimumProtocolVersion,
      `MCP protocol ${minimumProtocolVersion} or later is required`
    )

    stage = 'tool_discovery'
    const { tools } = await client.listTools()
    const toolNames = new Set(tools.map(({ name }) => name))

    for (const requiredTool of [
      'ping',
      'search_research',
      'get_reference',
      'create_note'
    ]) {
      assert(toolNames.has(requiredTool), `Missing required tool: ${requiredTool}`)
    }

    stage = 'ping'
    const ping = await client.callTool({ name: 'ping', arguments: {} })
    assert.equal(ping.isError, undefined)
    assert.match(ping.content?.[0]?.text ?? '', /online/i)

    stage = 'search_research'
    const search = await client.callTool({
      name: 'search_research',
      arguments: { query: searchQuery }
    })
    assert.equal(search.isError, undefined)

    const searchResults = search.structuredContent?.results
    const matchingSearchResult = Array.isArray(searchResults)
      ? searchResults.find((result) => result.reference_id === expectedReferenceId)
      : undefined
    searchDiagnostics = {
      searchResultsArray: Array.isArray(searchResults),
      searchResultCount: Array.isArray(searchResults) ? searchResults.length : null,
      expectedReferenceFound: Boolean(matchingSearchResult)
    }

    stage = 'get_reference'
    const reference = await client.callTool({
      name: 'get_reference',
      arguments: { reference_id: expectedReferenceId }
    })

    stage = 'search_result_assertion'
    assert(
      matchingSearchResult,
      'The unique search query did not return the expected reference ID'
    )

    stage = 'reference_assertion'
    assert.equal(reference.isError, undefined)
    assert.equal(
      reference.structuredContent?.reference?.id,
      expectedReferenceId,
      'get_reference returned the wrong reference ID'
    )
    assert.equal(
      reference.structuredContent?.reference?.title,
      expectedReferenceTitle,
      'get_reference returned an unexpected reference title'
    )

    stage = 'create_note'
    const noteMarker = `MCP live verification ${new Date().toISOString()}`
    const createdNote = await client.callTool({
      name: 'create_note',
      arguments: {
        reference_id: expectedReferenceId,
        kind: 'note',
        content: noteMarker
      }
    })
    assert.equal(createdNote.isError, undefined)
    assert.equal(createdNote.structuredContent?.reference_id, expectedReferenceId)
    assert.equal(createdNote.structuredContent?.content, noteMarker)
    assert.match(
      createdNote.structuredContent?.id ?? '',
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      'create_note did not return a note UUID'
    )

    stage = 'note_persistence'
    const updatedReference = await client.callTool({
      name: 'get_reference',
      arguments: { reference_id: expectedReferenceId }
    })
    assert.equal(updatedReference.isError, undefined)
    assert(
      (updatedReference.structuredContent?.notes ?? []).some(
        (note) => note.id === createdNote.structuredContent.id &&
          note.content === noteMarker
      ),
      'The created note was not persisted on the expected reference'
    )

    console.log(
      `MCP live test passed: negotiated ${negotiatedProtocolVersion}, ` +
      `discovered ${tools.length} tools, searched, loaded the expected ` +
      'reference, and created and retrieved a persisted note.'
    )
  } catch (error) {
    logConnectionDiagnostics(stage, error, searchDiagnostics)
    throw error
  } finally {
    if (connected) {
      await client.close().catch(() => {})
    }
  }

  const invalidClient = new Client({
    name: 'cr8ve-research-invalid-auth-check',
    version: '1.0.0'
  })
  const invalidTransport = new StreamableHTTPClientTransport(
    new URL(endpoint),
    { authProvider: { token: async () => `${accessToken}-invalid` } }
  )
  let invalidClientConnected = false

  try {
    await assert.rejects(async () => {
      await invalidClient.connect(invalidTransport)
      invalidClientConnected = true
    })
    console.log('MCP live test passed: invalid credentials were rejected.')
  } finally {
    if (invalidClientConnected) {
      await invalidClient.close().catch(() => {})
    }
  }
}
