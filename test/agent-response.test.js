import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createReferenceNavigationTarget,
  parseAgentResponse
} from '../src/lib/agent-response.js'

const MOCK_LABEL = '[MOCK MODEL — LOCAL DEVELOPMENT ONLY]'
const REFERENCE_ID = '22222222-2222-4222-8222-222222222222'

function mockAnswer(...sections) {
  return [
    MOCK_LABEL,
    'This deterministic response displays actual research tool results. It does not perform model reasoning or infer additional findings.',
    ...sections
  ].join('\n\n')
}

test('structures retrieved references, notes, and sources from mock results', () => {
  const search = {
    query: 'memory',
    count: 1,
    results: [{
      type: 'reference',
      title: 'Archive fragment',
      snippet: 'A study of memory and fragments.',
      reference_id: REFERENCE_ID
    }]
  }
  const detail = {
    found: true,
    reference: {
      reference: {
        id: REFERENCE_ID,
        title: 'Archive fragment',
        description: 'Stored reference context.'
      },
      notes: [{ id: 'note-1', kind: 'observation', content: 'A stored note.' }],
      sources: [{
        id: 'source-1',
        title: 'Source text',
        creator: 'Researcher',
        url: 'https://example.com/source',
        description: 'Source context.'
      }]
    }
  }

  const response = parseAgentResponse(mockAnswer(
    `search_research:\n${JSON.stringify(search, null, 2)}`,
    `get_reference:\n${JSON.stringify(detail, null, 2)}`
  ))

  assert.equal(response.kind, 'retrieval')
  assert.match(response.summary, /stored evidence only/i)
  assert.deepEqual(response.references, [{
    id: REFERENCE_ID,
    title: 'Archive fragment',
    context: 'Stored reference context.',
    reference: detail.reference.reference
  }])
  assert.equal(response.notes[0].content, 'A stored note.')
  assert.equal(response.sources[0].title, 'Source text')
  assert.equal(response.sources[0].url, 'https://example.com/source')
})

test('creates a reference navigation target only from returned fields', () => {
  const target = createReferenceNavigationTarget({
    id: REFERENCE_ID,
    title: 'Archive fragment',
    context: 'Retrieved context.',
    reference: null
  }, 'user-1')

  assert.deepEqual(target, {
    id: REFERENCE_ID,
    title: 'Archive fragment',
    description: 'Retrieved context.',
    user_id: 'user-1'
  })
  assert.equal(createReferenceNavigationTarget({}, 'user-1'), null)
})

test('reports no matches without exposing a tool dump', () => {
  const response = parseAgentResponse(
    `${MOCK_LABEL}\n\nNo relevant research was found for this question.`
  )

  assert.equal(response.kind, 'empty')
  assert.equal(response.summary, 'No relevant research was found for this question.')
  assert.deepEqual(response.references, [])
})

test('handles partial mock data without inventing missing sections', () => {
  const response = parseAgentResponse(mockAnswer(
    'search_research:\n{"query":"memory","count":1,"results":['
  ))

  assert.equal(response.kind, 'retrieval')
  assert.deepEqual(response.references, [])
  assert.deepEqual(response.notes, [])
  assert.deepEqual(response.sources, [])
})

test('preserves normal provider text as interpretation', () => {
  const response = parseAgentResponse('The archive suggests a recurring tension.')

  assert.equal(response.kind, 'interpretation')
  assert.equal(response.summary, 'The archive suggests a recurring tension.')
})
