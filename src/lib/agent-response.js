const MOCK_LABEL = '[MOCK MODEL — LOCAL DEVELOPMENT ONLY]'
const TOOL_NAMES = ['search_research', 'get_reference', 'get_research_space']

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readToolResults(answer) {
  const markers = TOOL_NAMES.map((name) => ({
    name,
    index: answer.indexOf(`${name}:\n`)
  }))
    .filter(({ index }) => index >= 0)
    .sort((left, right) => left.index - right.index)

  const results = new Map()

  markers.forEach((marker, index) => {
    const start = marker.index + marker.name.length + 2
    const end = markers[index + 1]?.index ?? answer.length

    try {
      results.set(marker.name, JSON.parse(answer.slice(start, end).trim()))
    } catch {
      // A partial development response remains readable without exposing JSON.
    }
  })

  return results
}

function addReference(references, candidate) {
  if (
    !isObject(candidate) ||
    typeof candidate.reference_id !== 'string' ||
    typeof candidate.title !== 'string'
  ) {
    return
  }

  if (!references.some(({ id }) => id === candidate.reference_id)) {
    references.push({
      id: candidate.reference_id,
      title: candidate.title,
      context: typeof candidate.snippet === 'string' ? candidate.snippet : '',
      reference: null
    })
  }
}

export function parseAgentResponse(answer) {
  if (typeof answer !== 'string' || !answer.startsWith(MOCK_LABEL)) {
    return {
      kind: 'interpretation',
      summary: answer,
      references: [],
      notes: [],
      sources: []
    }
  }

  if (/No relevant research was found/i.test(answer)) {
    return {
      kind: 'empty',
      summary: 'No relevant research was found for this question.',
      references: [],
      notes: [],
      sources: []
    }
  }

  const toolResults = readToolResults(answer)
  const search = toolResults.get('search_research')
  const detailResult = toolResults.get('get_reference')
  const references = []
  const notes = []
  const sources = []

  if (Array.isArray(search?.results)) {
    search.results.forEach((result) => {
      addReference(references, result)

      if (
        isObject(result) &&
        result.type === 'note' &&
        typeof result.snippet === 'string'
      ) {
        notes.push({
          id: typeof result.note_id === 'string' ? result.note_id : null,
          kind: typeof result.title === 'string' ? result.title : 'Note',
          content: result.snippet,
          referenceId: typeof result.reference_id === 'string'
            ? result.reference_id
            : null
        })
      }
    })
  }

  const detail = isObject(detailResult?.reference)
    ? detailResult.reference
    : null
  const record = isObject(detail?.reference) ? detail.reference : null

  if (record && typeof record.id === 'string' && typeof record.title === 'string') {
    const existing = references.find(({ id }) => id === record.id)
    const normalized = {
      id: record.id,
      title: record.title,
      context: typeof record.description === 'string' ? record.description : '',
      reference: record
    }

    if (existing) {
      Object.assign(existing, normalized)
    } else {
      references.push(normalized)
    }
  }

  if (Array.isArray(detail?.notes)) {
    detail.notes.forEach((note) => {
      if (isObject(note) && typeof note.content === 'string') {
        notes.push({
          id: typeof note.id === 'string' ? note.id : null,
          kind: typeof note.kind === 'string' ? note.kind : 'Note',
          content: note.content,
          referenceId: record?.id ?? null
        })
      }
    })
  }

  if (Array.isArray(detail?.sources)) {
    detail.sources.forEach((source) => {
      if (isObject(source) && typeof source.title === 'string') {
        sources.push({
          id: typeof source.id === 'string' ? source.id : null,
          title: source.title,
          creator: typeof source.creator === 'string' ? source.creator : '',
          description: typeof source.description === 'string'
            ? source.description
            : '',
          url: typeof source.url === 'string' ? source.url : ''
        })
      }
    })
  }

  const count = typeof search?.count === 'number'
    ? search.count
    : references.length + notes.length

  return {
    kind: 'retrieval',
    summary: `${count} matching research ${count === 1 ? 'item was' : 'items were'} retrieved. The sections below contain stored evidence only; no analysis was generated.`,
    references,
    notes,
    sources
  }
}

export function createReferenceNavigationTarget(item, userId) {
  if (!isObject(item) || typeof item.id !== 'string') {
    return null
  }

  return {
    ...(isObject(item.reference) ? item.reference : {}),
    id: item.id,
    title: typeof item.title === 'string' ? item.title : 'Untitled reference',
    description: typeof item.context === 'string' ? item.context : '',
    user_id: userId
  }
}
