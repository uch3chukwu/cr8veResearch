import assert from 'node:assert/strict'
import test from 'node:test'

import { createMockModel } from '../agent/mock-model.js'
import { createResearchModel } from '../agent/model.js'
import { runResearchAgent } from '../agent/run.js'

const REFERENCE_ID = '22222222-2222-4222-8222-222222222222'

test('mock model calls research tools and renders their actual results', async () => {
  const executions = []
  const answer = await runResearchAgent({
    model: createMockModel(),
    supabase: { requestScoped: true },
    message: 'memory',
    executeTool: async ({ name, input, supabase }) => {
      executions.push({ name, input, supabase })

      if (name === 'search_research') {
        return {
          query: 'memory',
          count: 1,
          results: [
            {
              type: 'reference',
              title: 'Archive fragment',
              snippet: 'A note about memory.',
              reference_id: REFERENCE_ID
            }
          ]
        }
      }

      return {
        found: true,
        reference: {
          reference: {
            id: REFERENCE_ID,
            title: 'Archive fragment'
          },
          media: [],
          notes: [{ content: 'A note about memory.' }],
          sources: []
        }
      }
    }
  })

  assert.deepEqual(executions.map(({ name }) => name), [
    'search_research',
    'get_reference'
  ])
  assert.deepEqual(executions[0].input, { query: 'memory', limit: 5 })
  assert.equal(executions[0].supabase, executions[1].supabase)
  assert.match(answer, /^\[MOCK MODEL — LOCAL DEVELOPMENT ONLY\]/)
  assert.match(answer, /Archive fragment/)
  assert.match(answer, /A note about memory\./)
  assert.match(answer, /does not perform model reasoning/i)
})

test('mock model explicitly reports empty research results', async () => {
  const answer = await runResearchAgent({
    model: createMockModel(),
    supabase: {},
    message: 'nothing here',
    executeTool: async () => ({
      query: 'nothing here',
      count: 0,
      results: []
    })
  })

  assert.equal(
    answer,
    '[MOCK MODEL — LOCAL DEVELOPMENT ONLY]\n\n' +
      'No relevant research was found for this question.'
  )
})

test('provider selection defaults to Bedrock', () => {
  const bedrockModel = { provider: 'bedrock-test-double' }
  let creations = 0
  const model = createResearchModel({
    env: {},
    createBedrock() {
      creations += 1
      return bedrockModel
    }
  })

  assert.equal(model, bedrockModel)
  assert.equal(creations, 1)
})

test('provider selection returns the mock model only when requested by env', async () => {
  const model = createResearchModel({
    env: {
      AGENT_MODEL_PROVIDER: 'mock',
      NODE_ENV: 'development'
    }
  })
  const response = await model.converse({
    messages: [{ role: 'user', content: 'memory' }],
    tools: [{ name: 'search_research' }]
  })

  assert.deepEqual(response.toolCalls, [
    {
      id: 'mock-search-1',
      name: 'search_research',
      input: { query: 'memory', limit: 5 }
    }
  ])
})

test('provider selection rejects mock mode in production', () => {
  assert.throws(
    () => createResearchModel({
      env: {
        AGENT_MODEL_PROVIDER: 'mock',
        NODE_ENV: 'production'
      }
    }),
    { message: 'Mock research model is unavailable outside development' }
  )
})
