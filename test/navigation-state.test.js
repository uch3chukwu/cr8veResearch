import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAgentSession,
  mergeAgentSession
} from '../src/lib/agent-session.js'
import { getReferenceBackLabel } from '../src/lib/reference-navigation.js'

test('reference navigation uses a contextual label for each origin', () => {
  assert.equal(getReferenceBackLabel('agent'), '← BACK TO AGENT')
  assert.equal(getReferenceBackLabel('research'), '← BACK TO REFERENCES')
  assert.equal(getReferenceBackLabel(), '← BACK TO REFERENCES')
})

test('agent session updates preserve conversation and display state', () => {
  const reference = { id: 'reference-1', title: 'Archive fragment' }
  const exchange = {
    id: 'exchange-1',
    question: 'Where does memory recur?',
    answer: 'Retrieved evidence.'
  }
  const session = mergeAgentSession(createAgentSession(), {
    question: 'A follow-up draft',
    exchanges: [exchange],
    selectedReference: reference
  })

  const afterViewSwitch = mergeAgentSession(session, { error: '' })

  assert.equal(afterViewSwitch.question, 'A follow-up draft')
  assert.deepEqual(afterViewSwitch.exchanges, [exchange])
  assert.equal(afterViewSwitch.selectedReference, reference)
})

test('a new authenticated app session starts with no conversation', () => {
  assert.deepEqual(createAgentSession(), {
    question: '',
    exchanges: [],
    pendingQuestion: '',
    error: '',
    loading: false,
    selectedReference: null
  })
})
