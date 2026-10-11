export async function loadResearchSpace(supabase, spaceId) {
  const { data, error } = await supabase
    .from('research_spaces')
    .select('id, title, description, created_at, updated_at')
    .eq('id', spaceId)
    .maybeSingle()

  if (error) {
    throw new Error('Research space query failed')
  }

  return data
}
