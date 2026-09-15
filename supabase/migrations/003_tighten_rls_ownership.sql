-- ============================================================
-- CR8VERESEARCH
-- 003_tighten_rls_ownership.sql
-- Require ownership of every user-owned record referenced by
-- junction rows, notes, and reference relationships.
-- ============================================================

drop policy if exists "users can manage reference spaces"
on public.reference_spaces;

create policy "users can manage reference spaces"
on public.reference_spaces
for all
to authenticated
using (
  exists (
    select 1
    from public.references r
    where r.id = reference_spaces.reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.research_spaces rs
    where rs.id = reference_spaces.research_space_id
      and rs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_spaces.reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.research_spaces rs
    where rs.id = reference_spaces.research_space_id
      and rs.user_id = auth.uid()
  )
);


drop policy if exists "users can manage reference sources"
on public.reference_sources;

create policy "users can manage reference sources"
on public.reference_sources
for all
to authenticated
using (
  exists (
    select 1
    from public.references r
    where r.id = reference_sources.reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.sources s
    where s.id = reference_sources.source_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_sources.reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.sources s
    where s.id = reference_sources.source_id
      and s.user_id = auth.uid()
  )
);


drop policy if exists "users can manage reference subjects"
on public.reference_subjects;

create policy "users can manage reference subjects"
on public.reference_subjects
for all
to authenticated
using (
  exists (
    select 1
    from public.references r
    where r.id = reference_subjects.reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.subjects s
    where s.id = reference_subjects.subject_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_subjects.reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.subjects s
    where s.id = reference_subjects.subject_id
      and s.user_id = auth.uid()
  )
);


drop policy if exists "users can manage their own notes"
on public.notes;

create policy "users can manage their own notes"
on public.notes
for all
to authenticated
using (
  auth.uid() = notes.user_id
  and (
    notes.reference_id is null
    or exists (
      select 1
      from public.references r
      where r.id = notes.reference_id
        and r.user_id = auth.uid()
    )
  )
  and (
    notes.research_space_id is null
    or exists (
      select 1
      from public.research_spaces rs
      where rs.id = notes.research_space_id
        and rs.user_id = auth.uid()
    )
  )
)
with check (
  auth.uid() = notes.user_id
  and (
    notes.reference_id is null
    or exists (
      select 1
      from public.references r
      where r.id = notes.reference_id
        and r.user_id = auth.uid()
    )
  )
  and (
    notes.research_space_id is null
    or exists (
      select 1
      from public.research_spaces rs
      where rs.id = notes.research_space_id
        and rs.user_id = auth.uid()
    )
  )
);


drop policy if exists "users can manage their own relationships"
on public.reference_relationships;

create policy "users can manage their own relationships"
on public.reference_relationships
for all
to authenticated
using (
  auth.uid() = reference_relationships.user_id
  and exists (
    select 1
    from public.references from_reference
    where from_reference.id = reference_relationships.from_reference_id
      and from_reference.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.references to_reference
    where to_reference.id = reference_relationships.to_reference_id
      and to_reference.user_id = auth.uid()
  )
)
with check (
  auth.uid() = reference_relationships.user_id
  and exists (
    select 1
    from public.references from_reference
    where from_reference.id = reference_relationships.from_reference_id
      and from_reference.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.references to_reference
    where to_reference.id = reference_relationships.to_reference_id
      and to_reference.user_id = auth.uid()
  )
);
