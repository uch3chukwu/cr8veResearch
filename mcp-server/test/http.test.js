import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

import { createHttpRequestHandler } from '../lib/http.js'

const ACCESS_TOKEN = 'test-user-access-token'

function createSupabaseFactory({ authenticated = true } = {}) {
  const clients = []
  const tokens = []

  return {
    clients,
    tokens,
    createSupabaseClient(token) {
      const client = {
        auth: {
          async getUser() {
            return authenticated
              ? { data: { user: { id: 'user-1' } }, error: null }
              : { data: { user: null }, error: { message: 'expired token' } }
          }
        }
      }

      tokens.push(token)
      clients.push(client)
      return client
    }
  }
}

async function request(handler, {
  method = 'POST',
  path = '/agent',
  authorization = `Bearer ${ACCESS_TOKEN}`,
  body
} = {}) {
  const server = createServer(handler)

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const address = server.address()
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: authorization === null
        ? { 'Content-Type': 'application/json' }
        : {
            Authorization: authorization,
            'Content-Type': 'application/json'
          },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    const text = await response.text()

    return {
      status: response.status,
      headers: response.headers,
      body: text ? JSON.parse(text) : null
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}

function createHandler({
  authenticated = true,
  createModel = () => ({
    async converse() {
      return { text: 'Grounded answer.' }
    }
  }),
  handleMcpRequest = (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ mcp: true }))
  }
} = {}) {
  const supabaseFactory = createSupabaseFactory({ authenticated })
  const errors = []
  const handler = createHttpRequestHandler({
    handleMcpRequest,
    createSupabaseClient: supabaseFactory.createSupabaseClient,
    createModel,
    logger: {
      error(...args) {
        errors.push(args)
      }
    }
  })

  return { handler, supabaseFactory, errors }
}

test('returns an agent answer for a valid authenticated request', async () => {
  const modelCalls = []
  const model = {
    async converse(input) {
      modelCalls.push(input)
      return { text: 'The research connects art and consciousness.' }
    }
  }
  const { handler, supabaseFactory } = createHandler({
    createModel: () => model
  })

  const response = await request(handler, {
    body: { message: 'What connections have I found?' }
  })

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, {
    answer: 'The research connects art and consciousness.'
  })
  assert.deepEqual(supabaseFactory.tokens, [ACCESS_TOKEN])
  assert.equal(modelCalls.length, 1)
})

test('rejects a missing Bearer token without invoking the model', async () => {
  let modelCreations = 0
  const { handler } = createHandler({
    createModel() {
      modelCreations += 1
      return {}
    }
  })

  const response = await request(handler, {
    authorization: null,
    body: { message: 'Question.' }
  })

  assert.equal(response.status, 401)
  assert.equal(response.headers.get('www-authenticate'), 'Bearer')
  assert.equal(modelCreations, 0)
})

test('rejects a malformed Bearer token without invoking the model', async () => {
  let modelCreations = 0
  const { handler } = createHandler({
    createModel() {
      modelCreations += 1
      return {}
    }
  })

  const response = await request(handler, {
    authorization: 'Token malformed',
    body: { message: 'Question.' }
  })

  assert.equal(response.status, 401)
  assert.equal(modelCreations, 0)
})

test('rejects an invalid or expired access token', async () => {
  let modelCreations = 0
  const { handler } = createHandler({
    authenticated: false,
    createModel() {
      modelCreations += 1
      return {}
    }
  })

  const response = await request(handler, {
    body: { message: 'Question.' }
  })

  assert.equal(response.status, 401)
  assert.deepEqual(response.body, { error: 'Authentication failed' })
  assert.equal(modelCreations, 0)
})

for (const [name, message] of [
  ['empty', '   '],
  ['oversized', 'x'.repeat(4001)]
]) {
  test(`rejects an ${name} message`, async () => {
    let modelCreations = 0
    const { handler } = createHandler({
      createModel() {
        modelCreations += 1
        return {}
      }
    })

    const response = await request(handler, { body: { message } })

    assert.equal(response.status, 400)
    assert.deepEqual(response.body, { error: 'A valid message is required' })
    assert.equal(modelCreations, 0)
  })
}

test('returns a generic unavailable response for model failure', async () => {
  const { handler, errors } = createHandler({
    createModel: () => ({
      async converse() {
        throw new Error('private AWS failure detail')
      }
    })
  })

  const response = await request(handler, { body: { message: 'Question.' } })

  assert.equal(response.status, 503)
  assert.deepEqual(response.body, { error: 'Research agent is unavailable' })
  assert.doesNotMatch(JSON.stringify(response.body), /AWS|private|detail/i)
  assert.equal(errors.length, 1)
})

test('returns a generic unavailable response for tool failure', async () => {
  const model = {
    async converse() {
      return {
        toolCalls: [{ id: 'unknown-1', name: 'unknown_tool', input: {} }]
      }
    }
  }
  const { handler } = createHandler({ createModel: () => model })

  const response = await request(handler, { body: { message: 'Question.' } })

  assert.equal(response.status, 503)
  assert.deepEqual(response.body, { error: 'Research agent is unavailable' })
})

test('does not invoke an agent when Bedrock configuration is missing', async () => {
  const { handler } = createHandler({
    createModel() {
      throw new Error('BEDROCK_MODEL_ID is required')
    }
  })

  const response = await request(handler, { body: { message: 'Question.' } })

  assert.equal(response.status, 503)
  assert.deepEqual(response.body, { error: 'Research agent is unavailable' })
})

test('preserves authenticated MCP request routing', async () => {
  let calls = 0
  const { handler } = createHandler({
    handleMcpRequest(_req, res) {
      calls += 1
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ mcp: true }))
    }
  })

  const response = await request(handler, {
    path: '/mcp',
    body: { jsonrpc: '2.0' }
  })

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { mcp: true })
  assert.equal(calls, 1)
})

test('preserves MCP Bearer authentication', async () => {
  let calls = 0
  const { handler } = createHandler({
    handleMcpRequest() {
      calls += 1
    }
  })

  const response = await request(handler, {
    path: '/mcp',
    authorization: null,
    body: { jsonrpc: '2.0' }
  })

  assert.equal(response.status, 401)
  assert.deepEqual(response.body, { error: 'Bearer authorization required' })
  assert.equal(calls, 0)
})
