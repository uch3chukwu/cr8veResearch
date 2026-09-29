import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createNoteInputSchema,
  runCreateNote
} from '../lib/note.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const REFERENCE_ID = '22222222-2222-4222-8222-222222222222'
const SPACE_ID = '33333333-3333-4333-8333-333333333333'

function createSupabaseMock({ insertError = null } = {}) {
  const calls = {
    authGetUser: 0,
    table: null,
    insert: null,
    select: null
  }

  const createdNote = {
    id: '44444444-4444-4444-8444-444444444444',
    kind: 'note',
    content: 'A useful note',
    reference_id: null,
    research_space_id: null,
    created_at: '2026-09-29T10:00:00.000Z',
    updated_at: '2026-09-29T10:00:00.000Z'
  }

  const builder = {
    insert(payload) {
      calls.insert = payload
      createdNote.kind = payload.kind
      createdNote.content = payload.content
      createdNote.reference_id = payload.reference_id ?? null
      createdNote.research_space_id = payload.research_space_id ?? null
      return this
    },
    select(columns) {
      calls.select = columns
      return this
    },
    async single() {
      return insertError
        ? { data: null, error: insertError }
        : { data: createdNote, error: null }
    }
  }

  return {
    calls,
    client: {
      auth: {
        async getUser() {
          calls.authGetUser += 1
          return {
            data: { user: { id: USER_ID } },
            error: null
          }
        }
      },
      from(table) {
        calls.table = table
        return builder
      }
    }
  }
}

test('creates one note attached to a reference', async () => {
  const { client, calls } = createSupabaseMock()
  const input = createNoteInputSchema.parse({
    content: '  A useful note  ',
    reference_id: REFERENCE_ID
  })
  const result = await runCreateNote(client, input)

  assert.equal(result.isError, undefined)
  assert.equal(result.structuredContent.reference_id, REFERENCE_ID)
  assert.equal(result.structuredContent.kind, 'note')
  assert.equal(calls.table, 'notes')
  assert.equal(calls.authGetUser, 1)
  assert.deepEqual(calls.insert, {
    user_id: USER_ID,
    reference_id: REFERENCE_ID,
    research_space_id: undefined,
    content: 'A useful note',
    kind: 'note'
  })
})

test('creates one note attached to a research space', async () => {
  const { client } = createSupabaseMock()
  const input = createNoteInputSchema.parse({
    content: 'Space note',
    kind: 'observation',
    research_space_id: SPACE_ID
  })
  const result = await runCreateNote(client, input)

  assert.equal(result.isError, undefined)
  assert.equal(result.structuredContent.research_space_id, SPACE_ID)
  assert.equal(result.structuredContent.kind, 'observation')
})

test('rejects empty content', () => {
  assert.throws(() => createNoteInputSchema.parse({
    content: '   ',
    reference_id: REFERENCE_ID
  }))
})

test('rejects an invalid UUID', () => {
  assert.throws(() => createNoteInputSchema.parse({
    content: 'Note',
    reference_id: 'not-a-uuid'
  }))
})

test('rejects an invalid kind', () => {
  assert.throws(() => createNoteInputSchema.parse({
    content: 'Note',
    kind: 'invalid',
    reference_id: REFERENCE_ID
  }))
})

test('rejects a missing parent', () => {
  assert.throws(() => createNoteInputSchema.parse({ content: 'Note' }))
})

test('returns a generic error when RLS rejects an inaccessible parent', async () => {
  const { client } = createSupabaseMock({
    insertError: { message: 'new row violates row-level security policy' }
  })
  const result = await runCreateNote(client, {
    content: 'Note',
    kind: 'note',
    reference_id: REFERENCE_ID
  })

  assert.equal(result.isError, true)
  assert.equal(result.content[0].text, 'Unable to create the note.')
  assert.doesNotMatch(result.content[0].text, /row-level|security|policy/i)
})

test('returns a generic error for a database failure', async () => {
  const { client } = createSupabaseMock({
    insertError: { message: 'connection detail that must stay private' }
  })
  const result = await runCreateNote(client, {
    content: 'Note',
    kind: 'note',
    reference_id: REFERENCE_ID
  })

  assert.equal(result.isError, true)
  assert.equal(result.content[0].text, 'Unable to create the note.')
  assert.doesNotMatch(result.content[0].text, /connection detail/i)
})

test('derives ownership from the authenticated Supabase user', async () => {
  const { client, calls } = createSupabaseMock()
  await runCreateNote(client, {
    content: 'Note',
    kind: 'question',
    reference_id: REFERENCE_ID
  })

  assert.equal(calls.authGetUser, 1)
  assert.equal(calls.insert.user_id, USER_ID)
})
