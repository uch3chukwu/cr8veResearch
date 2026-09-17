const SNIPPET_LENGTH = 240

function escapeLikePattern(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
}

function createSnippet(value, query) {
  const text = value.replace(/\s+/g, ' ').trim()

  if (text.length <= SNIPPET_LENGTH) {
    return text
  }

  const matchIndex = text.toLowerCase().indexOf(query.toLowerCase())
  const start = Math.max(0, matchIndex - 80)
  const prefix = start > 0 ? '...' : ''
  let end = Math.min(text.length, start + SNIPPET_LENGTH - prefix.length)
  const suffix = end < text.length ? '...' : ''

  end -= suffix.length

  return `${prefix}${text.slice(start, end).trim()}${suffix}`
}

function uniqueRows(...groups) {
  const rows = new Map()

  groups.flat().forEach((row) => {
    rows.set(row.id, row)
  })

  return [...rows.values()]
}

function takeInterleaved(groups, limit) {
  const results = []

  for (let index = 0; results.length < limit; index += 1) {
    let added = false

    for (const group of groups) {
      if (group[index] && results.length < limit) {
        results.push(group[index])
        added = true
      }
    }

    if (!added) {
      break
    }
  }

  return results
}

export async function searchResearch(supabase, query, limit) {
  const pattern = `%${escapeLikePattern(query)}%`

  const [
    referencesByTitle,
    referencesByDescription,
    mediaByTitle,
    textMediaByContent,
    notesByContent,
    spacesByTitle,
    spacesByDescription
  ] = await Promise.all([
    supabase
      .from('references')
      .select('id, title, description')
      .ilike('title', pattern)
      .limit(limit),
    supabase
      .from('references')
      .select('id, title, description')
      .ilike('description', pattern)
      .limit(limit),
    supabase
      .from('reference_media')
      .select('id, reference_id, media_type, title, content')
      .ilike('title', pattern)
      .limit(limit),
    supabase
      .from('reference_media')
      .select('id, reference_id, media_type, title, content')
      .eq('media_type', 'text')
      .ilike('content', pattern)
      .limit(limit),
    supabase
      .from('notes')
      .select('id, reference_id, research_space_id, kind, content')
      .ilike('content', pattern)
      .limit(limit),
    supabase
      .from('research_spaces')
      .select('id, title, description')
      .ilike('title', pattern)
      .limit(limit),
    supabase
      .from('research_spaces')
      .select('id, title, description')
      .ilike('description', pattern)
      .limit(limit)
  ])

  const queryResults = [
    referencesByTitle,
    referencesByDescription,
    mediaByTitle,
    textMediaByContent,
    notesByContent,
    spacesByTitle,
    spacesByDescription
  ]

  if (queryResults.some(({ error }) => error)) {
    throw new Error('Research search query failed')
  }

  const references = uniqueRows(
    referencesByTitle.data ?? [],
    referencesByDescription.data ?? []
  ).map((reference) => ({
    type: 'reference',
    title: reference.title,
    snippet: createSnippet(
      [reference.title, reference.description].filter(Boolean).join(' - '),
      query
    ),
    reference_id: reference.id
  }))

  const media = uniqueRows(
    mediaByTitle.data ?? [],
    textMediaByContent.data ?? []
  ).map((item) => ({
    type: item.media_type === 'text' ? 'text_media' : 'media',
    title: item.title || `${item.media_type} media`,
    snippet: createSnippet(
      item.media_type === 'text'
        ? [item.title, item.content].filter(Boolean).join(' - ')
        : item.title || `${item.media_type} media`,
      query
    ),
    media_type: item.media_type,
    media_id: item.id,
    reference_id: item.reference_id
  }))

  const notes = (notesByContent.data ?? []).map((note) => ({
    type: 'note',
    title: `${note.kind} note`,
    snippet: createSnippet(note.content, query),
    note_id: note.id,
    reference_id: note.reference_id,
    space_id: note.research_space_id
  }))

  const spaces = uniqueRows(
    spacesByTitle.data ?? [],
    spacesByDescription.data ?? []
  ).map((space) => ({
    type: 'research_space',
    title: space.title,
    snippet: createSnippet(
      [space.title, space.description].filter(Boolean).join(' - '),
      query
    ),
    space_id: space.id
  }))

  return takeInterleaved([references, media, notes, spaces], limit)
}
