const TEXT_LIMIT = 2000

function boundText(value) {
  if (typeof value !== 'string' || value.length <= TEXT_LIMIT) {
    return value
  }

  return `${value.slice(0, TEXT_LIMIT - 3).trimEnd()}...`
}

export async function loadReference(supabase, referenceId) {
  const { data: reference, error: referenceError } = await supabase
    .from('references')
    .select('id, title, description, created_at, updated_at')
    .eq('id', referenceId)
    .maybeSingle()

  if (referenceError) {
    throw new Error('Reference query failed')
  }

  if (!reference) {
    return null
  }

  const [mediaResult, notesResult, sourcesResult] = await Promise.all([
    supabase
      .from('reference_media')
      .select('id, media_type, title, url, content, position, created_at')
      .eq('reference_id', referenceId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('notes')
      .select('id, kind, content, research_space_id, created_at, updated_at')
      .eq('reference_id', referenceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('reference_sources')
      .select(`
        source_id,
        created_at,
        sources (
          id,
          title,
          source_type,
          creator,
          url,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('reference_id', referenceId)
      .order('created_at', { ascending: true })
  ])

  if (
    mediaResult.error ||
    notesResult.error ||
    sourcesResult.error
  ) {
    throw new Error('Related reference query failed')
  }

  return {
    reference: {
      ...reference,
      description: boundText(reference.description)
    },
    media: (mediaResult.data ?? []).map((item) => ({
      id: item.id,
      type: item.media_type,
      title: item.title,
      url: item.media_type === 'text' ? null : item.url,
      content: item.media_type === 'text'
        ? boundText(item.content)
        : null,
      position: item.position,
      created_at: item.created_at
    })),
    notes: (notesResult.data ?? []).map((note) => ({
      id: note.id,
      kind: note.kind,
      content: boundText(note.content),
      research_space_id: note.research_space_id,
      created_at: note.created_at,
      updated_at: note.updated_at
    })),
    sources: (sourcesResult.data ?? [])
      .filter(({ sources }) => sources)
      .map(({ sources, created_at: attachedAt }) => ({
        id: sources.id,
        title: sources.title,
        type: sources.source_type,
        creator: sources.creator,
        url: sources.url,
        description: boundText(sources.description),
        created_at: sources.created_at,
        updated_at: sources.updated_at,
        attached_at: attachedAt
      }))
  }
}
