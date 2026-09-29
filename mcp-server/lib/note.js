import { z } from 'zod'

export const NOTE_KINDS = [
  'note',
  'observation',
  'question',
  'annotation'
]

export const createNoteInputSchema = z.object({
  content: z.string().trim().min(1),
  kind: z.enum(NOTE_KINDS).default('note'),
  reference_id: z.string().uuid().optional(),
  research_space_id: z.string().uuid().optional()
}).refine(
  ({ reference_id: referenceId, research_space_id: researchSpaceId }) => (
    Boolean(referenceId || researchSpaceId)
  ),
  {
    message: 'A reference_id or research_space_id is required'
  }
)

export async function createNote(
  supabase,
  {
    content,
    kind = 'note',
    referenceId,
    researchSpaceId
  }
) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Unable to identify the authenticated user')
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userData.user.id,
      reference_id: referenceId,
      research_space_id: researchSpaceId,
      content,
      kind
    })
    .select(`
      id,
      kind,
      content,
      reference_id,
      research_space_id,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    throw new Error('Note creation failed')
  }

  return data
}

export async function runCreateNote(supabase, input) {
  try {
    const note = await createNote(supabase, {
      content: input.content,
      kind: input.kind,
      referenceId: input.reference_id,
      researchSpaceId: input.research_space_id
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(note, null, 2)
        }
      ],
      structuredContent: note
    }
  } catch {
    return {
      content: [
        {
          type: 'text',
          text: 'Unable to create the note.'
        }
      ],
      isError: true
    }
  }
}
