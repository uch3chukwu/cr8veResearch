import assert from 'node:assert/strict'
import test from 'node:test'

import { createBedrockModel } from '../agent/bedrock-model.js'
import { runResearchAgent } from '../agent/run.js'
import { RESEARCH_AGENT_TOOLS } from '../agent/tools.js'

const REFERENCE_ID = '22222222-2222-4222-8222-222222222222'

function createFakeModel(responses) {
  const calls = []

  return {
    calls,
    async converse(input) {
      calls.push(input)
      const response = typeof responses === 'function'
        ? responses(input, calls.length)
        : responses.shift()

      return structuredClone(response)
    }
  }
}

test('returns a direct model answer without executing tools', async () => {
  const model = createFakeModel([{ text: 'Direct answer.' }])
  let executions = 0

  const answer = await runResearchAgent({
    model,
    supabase: {},
    message: 'What do I know?',
    executeTool: async () => {
      executions += 1
    }
  })

  assert.equal(answer, 'Direct answer.')
  assert.equal(executions, 0)
  assert.equal(model.calls.length, 1)
})

test('executes search_research and returns its result to the model', async () => {
  const model = createFakeModel([
    {
      toolCalls: [
        {
          id: 'search-1',
          name: 'search_research',
          input: { query: 'collage' }
        }
      ]
    },
    { text: 'The research connects collage and memory.' }
  ])
  const executed = []

  const answer = await runResearchAgent({
    model,
    supabase: {},
    message: 'What themes recur?',
    executeTool: async (request) => {
      executed.push(request)
      return { query: 'collage', count: 1, results: [{ title: 'Memory' }] }
    }
  })

  assert.equal(answer, 'The research connects collage and memory.')
  assert.equal(executed[0].name, 'search_research')
  assert.deepEqual(model.calls[1].messages.at(-1).content, {
    query: 'collage',
    count: 1,
    results: [{ title: 'Memory' }]
  })
})

test('executes search_research followed by get_reference', async () => {
  const model = createFakeModel([
    {
      toolCalls: [
        {
          id: 'search-1',
          name: 'search_research',
          input: { query: 'archive' }
        }
      ]
    },
    {
      toolCalls: [
        {
          id: 'reference-1',
          name: 'get_reference',
          input: { reference_id: REFERENCE_ID }
        }
      ]
    },
    { text: 'The reference reveals an archival tension.' }
  ])
  const names = []

  const answer = await runResearchAgent({
    model,
    supabase: {},
    message: 'Investigate the archive theme.',
    executeTool: async ({ name }) => {
      names.push(name)
      return name === 'search_research'
        ? { results: [{ reference_id: REFERENCE_ID }] }
        : { found: true, reference: { id: REFERENCE_ID } }
    }
  })

  assert.equal(answer, 'The reference reveals an archival tension.')
  assert.deepEqual(names, ['search_research', 'get_reference'])
  assert.equal(model.calls.length, 3)
})

test('fails safely for an unknown tool request', async () => {
  const model = createFakeModel([
    {
      toolCalls: [
        { id: 'unknown-1', name: 'delete_everything', input: {} }
      ]
    }
  ])

  await assert.rejects(
    runResearchAgent({ model, supabase: {}, message: 'Do something.' }),
    { message: 'Unable to execute a research tool' }
  )
})

test('hides database and tool failure details', async () => {
  const model = createFakeModel([
    {
      toolCalls: [
        {
          id: 'search-1',
          name: 'search_research',
          input: { query: 'failure' }
        }
      ]
    }
  ])

  await assert.rejects(
    runResearchAgent({
      model,
      supabase: {},
      message: 'Search.',
      executeTool: async () => {
        throw new Error('private database detail')
      }
    }),
    (error) => {
      assert.equal(error.message, 'Unable to execute a research tool')
      assert.doesNotMatch(error.message, /private|database/i)
      return true
    }
  )
})

test('stops after the maximum number of tool rounds', async () => {
  const model = createFakeModel((_input, callNumber) => ({
    toolCalls: [
      {
        id: `search-${callNumber}`,
        name: 'search_research',
        input: { query: 'loop' }
      }
    ]
  }))
  let executions = 0

  await assert.rejects(
    runResearchAgent({
      model,
      supabase: {},
      message: 'Loop.',
      maxToolRounds: 5,
      executeTool: async () => {
        executions += 1
        return { results: [] }
      }
    }),
    { message: 'Research agent exceeded the tool-round limit' }
  )

  assert.equal(executions, 5)
  assert.equal(model.calls.length, 6)
})

test('passes the same authenticated Supabase client to tool execution', async () => {
  const supabase = { requestScoped: true }
  const model = createFakeModel([
    {
      toolCalls: [
        {
          id: 'search-1',
          name: 'search_research',
          input: { query: 'identity' }
        }
      ]
    },
    { text: 'Done.' }
  ])
  let receivedClient

  await runResearchAgent({
    model,
    supabase,
    message: 'Search.',
    executeTool: async (request) => {
      receivedClient = request.supabase
      return { results: [] }
    }
  })

  assert.equal(receivedClient, supabase)
})

test('Bedrock adapter sends tool specifications and the initial user message', async () => {
  const model = createBedrockModel({
    modelId: 'configured-inference-profile',
    client: {
      async send(command) {
        assert.equal(command.input.modelId, 'configured-inference-profile')
        assert.deepEqual(command.input.system, [{ text: 'Grounding instruction.' }])
        assert.deepEqual(command.input.messages, [
          {
            role: 'user',
            content: [{ text: 'What do I know?' }]
          }
        ])
        assert.deepEqual(
          command.input.toolConfig.tools.map(({ toolSpec }) => ({
            name: toolSpec.name,
            description: toolSpec.description,
            inputSchema: toolSpec.inputSchema
          })),
          RESEARCH_AGENT_TOOLS.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: { json: tool.inputSchema.toJSONSchema() }
          }))
        )

        return {
          stopReason: 'end_turn',
          output: {
            message: {
              content: [{ text: 'Grounded response.' }]
            }
          }
        }
      }
    }
  })

  const response = await model.converse({
    system: 'Grounding instruction.',
    messages: [{ role: 'user', content: 'What do I know?' }],
    tools: RESEARCH_AGENT_TOOLS
  })

  assert.deepEqual(response, {
    text: 'Grounded response.',
    toolCalls: []
  })
})

test('Bedrock adapter translates assistant tool use and grouped tool results', async () => {
  const model = createBedrockModel({
    modelId: 'configured-inference-profile',
    client: {
      async send(command) {
        assert.deepEqual(command.input.messages, [
          {
            role: 'user',
            content: [{ text: 'Find connections.' }]
          },
          {
            role: 'assistant',
            content: [
              { text: 'I will search.' },
              {
                toolUse: {
                  toolUseId: 'search-1',
                  name: 'search_research',
                  input: { query: 'memory' }
                }
              },
              {
                toolUse: {
                  toolUseId: 'space-1',
                  name: 'get_research_space',
                  input: { space_id: REFERENCE_ID }
                }
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                toolResult: {
                  toolUseId: 'search-1',
                  content: [{ json: { count: 0, results: [] } }]
                }
              },
              {
                toolResult: {
                  toolUseId: 'space-1',
                  content: [{ json: { found: false } }]
                }
              }
            ]
          }
        ])

        return {
          stopReason: 'end_turn',
          output: {
            message: {
              content: [{ text: 'No connections were found.' }]
            }
          }
        }
      }
    }
  })

  const response = await model.converse({
    system: 'Grounding instruction.',
    messages: [
      { role: 'user', content: 'Find connections.' },
      {
        role: 'assistant',
        content: {
          text: 'I will search.',
          toolCalls: [
            {
              id: 'search-1',
              name: 'search_research',
              input: { query: 'memory' }
            },
            {
              id: 'space-1',
              name: 'get_research_space',
              input: { space_id: REFERENCE_ID }
            }
          ]
        }
      },
      {
        role: 'tool',
        toolCallId: 'search-1',
        name: 'search_research',
        content: { count: 0, results: [] }
      },
      {
        role: 'tool',
        toolCallId: 'space-1',
        name: 'get_research_space',
        content: { found: false }
      }
    ],
    tools: RESEARCH_AGENT_TOOLS
  })

  assert.deepEqual(response, {
    text: 'No connections were found.',
    toolCalls: []
  })
})

test('Bedrock adapter preserves multiple tool calls without requiring text', async () => {
  const model = createBedrockModel({
    modelId: 'configured-inference-profile',
    client: {
      async send() {
        return {
          stopReason: 'tool_use',
          output: {
            message: {
              content: [
                {
                  toolUse: {
                    toolUseId: 'search-1',
                    name: 'search_research',
                    input: { query: 'memory' }
                  }
                },
                {
                  toolUse: {
                    toolUseId: 'reference-1',
                    name: 'get_reference',
                    input: { reference_id: REFERENCE_ID }
                  }
                }
              ]
            }
          }
        }
      }
    }
  })

  const response = await model.converse({
    system: 'Grounding instruction.',
    messages: [{ role: 'user', content: 'Investigate.' }],
    tools: RESEARCH_AGENT_TOOLS
  })

  assert.equal(response.text, undefined)
  assert.deepEqual(response.toolCalls, [
    {
      id: 'search-1',
      name: 'search_research',
      input: { query: 'memory' }
    },
    {
      id: 'reference-1',
      name: 'get_reference',
      input: { reference_id: REFERENCE_ID }
    }
  ])
})

test('Bedrock adapter sanitizes AWS SDK invocation failures', async () => {
  const model = createBedrockModel({
    modelId: 'configured-inference-profile',
    client: {
      async send() {
        throw new Error(
          'AWS request abc123 failed for account 123456789012'
        )
      }
    }
  })

  await assert.rejects(
    model.converse({
      system: 'Grounding instruction.',
      messages: [{ role: 'user', content: 'Question.' }],
      tools: RESEARCH_AGENT_TOOLS
    }),
    (error) => {
      assert.equal(error.message, 'Unable to invoke the research model')
      assert.doesNotMatch(error.message, /AWS|abc123|123456789012/i)
      return true
    }
  )
})

for (const stopReason of ['end_turn', 'stop_sequence']) {
  test(`Bedrock adapter rejects tool calls with ${stopReason}`, async () => {
    const model = createBedrockModel({
      modelId: 'configured-inference-profile',
      client: {
        async send() {
          return {
            stopReason,
            output: {
              message: {
                content: [
                  {
                    toolUse: {
                      toolUseId: 'search-1',
                      name: 'search_research',
                      input: { query: 'memory' }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    })

    await assert.rejects(
      model.converse({
        system: 'Grounding instruction.',
        messages: [{ role: 'user', content: 'Question.' }],
        tools: RESEARCH_AGENT_TOOLS
      }),
      { message: 'Bedrock returned an inconsistent response' }
    )
  })
}

test('Bedrock adapter rejects tool_use without tool calls', async () => {
  const model = createBedrockModel({
    modelId: 'configured-inference-profile',
    client: {
      async send() {
        return {
          stopReason: 'tool_use',
          output: {
            message: {
              content: [{ text: 'No tool call was provided.' }]
            }
          }
        }
      }
    }
  })

  await assert.rejects(
    model.converse({
      system: 'Grounding instruction.',
      messages: [{ role: 'user', content: 'Question.' }],
      tools: RESEARCH_AGENT_TOOLS
    }),
    { message: 'Bedrock returned malformed tool use' }
  )
})

for (const [stopReason, expectedMessage] of [
  ['max_tokens', 'Bedrock response was incomplete'],
  ['content_filtered', 'Bedrock response was filtered'],
  ['malformed_tool_use', 'Bedrock returned malformed output'],
  ['future_failure_reason', 'Bedrock response did not complete successfully']
]) {
  test(`Bedrock adapter rejects ${stopReason} safely`, async () => {
    const model = createBedrockModel({
      modelId: 'configured-inference-profile',
      client: {
        async send() {
          return {
            stopReason,
            output: {
              message: {
                content: [{ text: 'Raw provider response detail.' }]
              }
            }
          }
        }
      }
    })

    await assert.rejects(
      model.converse({
        system: 'Grounding instruction.',
        messages: [{ role: 'user', content: 'Question.' }],
        tools: RESEARCH_AGENT_TOOLS
      }),
      (error) => {
        assert.equal(error.message, expectedMessage)
        assert.doesNotMatch(error.message, /raw|provider|detail/i)
        return true
      }
    )
  })
}
