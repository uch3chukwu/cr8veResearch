import assert from 'node:assert/strict'
import test from 'node:test'

import { AgentApiError, askResearchAgent } from '../src/lib/agent.js'

test('sends an authenticated agent request and returns the answer', async () => {
  let request
  const answer = await askResearchAgent({
    message: 'What patterns recur?',
    accessToken: 'user-token',
    baseUrl: 'http://localhost:3001/',
    async fetchImpl(url, options) {
      request = { url, options }
      return new Response(JSON.stringify({ answer: 'A grounded answer.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })

  assert.equal(answer, 'A grounded answer.')
  assert.equal(request.url, 'http://localhost:3001/agent')
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers.Authorization, 'Bearer user-token')
  assert.deepEqual(JSON.parse(request.options.body), {
    message: 'What patterns recur?'
  })
})

for (const [status, expectedMessage] of [
  [400, 'That question could not be submitted. Check it and try again.'],
  [401, 'Your session has expired. Please log in again.'],
  [503, 'The research agent is temporarily unavailable.']
]) {
  test(`maps an HTTP ${status} response to a safe message`, async () => {
    await assert.rejects(
      askResearchAgent({
        message: 'Question.',
        accessToken: 'user-token',
        baseUrl: 'http://localhost:3001',
        async fetchImpl() {
          return new Response(JSON.stringify({ error: 'private detail' }), {
            status,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }),
      (error) => {
        assert.ok(error instanceof AgentApiError)
        assert.equal(error.status, status)
        assert.equal(error.message, expectedMessage)
        assert.doesNotMatch(error.message, /private detail/i)
        return true
      }
    )
  })
}

test('maps network failures to a safe message', async () => {
  await assert.rejects(
    askResearchAgent({
      message: 'Question.',
      accessToken: 'user-token',
      baseUrl: 'http://localhost:3001',
      async fetchImpl() {
        throw new Error('private network detail')
      }
    }),
    { message: 'Unable to reach the research agent.' }
  )
})
