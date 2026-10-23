import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

import {
  Client,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { createMcpHandler } from '@modelcontextprotocol/server'

import { createHttpRequestHandler } from '../lib/http.js'
import { createMcpServer } from '../server.js'

const VALID_TOKEN = 'valid-test-token'
const OWN_REFERENCE_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_REFERENCE_ID = '22222222-2222-4222-8222-222222222222'
const MINIMUM_PROTOCOL_VERSION = '2025-11-25'

function queryResult(table) {
  if (table === 'references') {
    return {
      data: [{
        id: OWN_REFERENCE_ID,
        title: 'Private user sentinel',
        description: 'Visible only through the authenticated user context'
      }],
      error: null
    }
  }

  return { data: [], error: null }
}

function createQuery(table) {
  const result = queryResult(table)
  const query = {
    select() { return query },
    ilike() { return query },
    eq() { return query },
    limit() { return query },
    order() { return query },
    maybeSingle: async () => ({ data: result.data[0] ?? null, error: null }),
    single: async () => ({ data: result.data[0] ?? null, error: null }),
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) }
  }
  return query
}

function createMockSupabase(token) {
  return {
    auth: {
      async getUser() {
        return token === VALID_TOKEN
          ? { data: { user: { id: 'user-1' } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } }
      }
    },
    from(table) { return createQuery(table) }
  }
}

async function startTestServer() {
  const mcpHandler = createMcpHandler(({ requestInfo }) => {
    const authorization = requestInfo.headers.get('authorization') ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '')
    return createMcpServer(createMockSupabase(token))
  })
  const handler = createHttpRequestHandler({
    handleMcpRequest: toNodeHandler(mcpHandler),
    createSupabaseClient: createMockSupabase,
    logger: { warn() {}, error() {} }
  })
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    server,
    url: new URL(`http://127.0.0.1:${port}/mcp`)
  }
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
}

function createClient(url, token) {
  const client = new Client({
    name: 'cr8ve-research-external-test',
    version: '1.0.0'
  })
  const transport = new StreamableHTTPClientTransport(url, {
    authProvider: { token: async () => token }
  })
  return { client, transport }
}

test('official MCP client initializes, discovers tools, and invokes user-scoped tools', async () => {
  const { server, url } = await startTestServer()
  const { client, transport } = createClient(url, VALID_TOKEN)

  try {
    await client.connect(transport)
    const negotiatedProtocolVersion = client.getNegotiatedProtocolVersion()
    assert.match(negotiatedProtocolVersion ?? '', /^\d{4}-\d{2}-\d{2}$/)
    assert(negotiatedProtocolVersion >= MINIMUM_PROTOCOL_VERSION)

    const { tools } = await client.listTools()
    assert.deepEqual(
      tools.map(({ name }) => name).sort(),
      [
        'create_note',
        'get_reference',
        'get_research_space',
        'ping',
        'search_research'
      ]
    )

    const ping = await client.callTool({ name: 'ping', arguments: {} })
    assert.equal(ping.isError, undefined)
    assert.match(ping.content[0].text, /online/i)

    const search = await client.callTool({
      name: 'search_research',
      arguments: { query: 'sentinel' }
    })
    assert.equal(search.isError, undefined)
    assert.equal(search.structuredContent.count, 1)
    assert.equal(search.structuredContent.results[0].reference_id, OWN_REFERENCE_ID)
    assert.doesNotMatch(JSON.stringify(search), new RegExp(OTHER_REFERENCE_ID))
  } finally {
    await client.close().catch(() => {})
    await closeServer(server)
  }
})

test('official MCP client is rejected for missing or invalid credentials', async () => {
  const { server, url } = await startTestServer()

  try {
    const missing = new Client({ name: 'missing-auth-test', version: '1.0.0' })
    const missingTransport = new StreamableHTTPClientTransport(url)
    await assert.rejects(missing.connect(missingTransport))
    await missing.close().catch(() => {})

    const { client, transport } = createClient(url, 'invalid-test-token')
    await assert.rejects(client.connect(transport))
    await client.close().catch(() => {})
  } finally {
    await closeServer(server)
  }
})
