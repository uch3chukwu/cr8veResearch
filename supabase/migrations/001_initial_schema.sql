-- ============================================================
-- CR8VERESEARCH
-- 001_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- Extends Supabase's built-in auth.users table.
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- RESEARCH SPACES
-- A bounded context for investigation.
-- ------------------------------------------------------------

create table public.research_spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  description text,

  color text,

  -- Private by default.
  -- 'discoverable' will eventually allow other creators
  -- to find the existence of this research space.
  visibility text not null default 'private'
    check (visibility in ('private', 'discoverable')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- REFERENCES
-- The central research object.
-- ------------------------------------------------------------

create table public.references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- MEDIA
-- A reference can contain multiple media components.
-- ------------------------------------------------------------

create table public.reference_media (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null
    references public.references(id) on delete cascade,

  media_type text not null
    check (media_type in (
      'image',
      'audio',
      'video',
      'text',
      'document',
      'link'
    )),

  url text,
  title text,

  position integer not null default 0,

  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- SOURCES
-- Provenance for references.
-- ------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,

  source_type text not null
    check (source_type in (
      'website',
      'book',
      'album',
      'publication',
      'archive',
      'museum',
      'person',
      'film',
      'personal',
      'other'
    )),

  creator text,
  url text,
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- REFERENCE ↔ SOURCE
-- A reference can have multiple sources.
-- A source can be associated with multiple references.
-- ------------------------------------------------------------

create table public.reference_sources (
  reference_id uuid not null
    references public.references(id) on delete cascade,

  source_id uuid not null
    references public.sources(id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key (reference_id, source_id)
);


-- ------------------------------------------------------------
-- CREATORS
-- Creators are searchable entities.
-- ------------------------------------------------------------

create table public.creators (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- REFERENCE ↔ CREATOR
-- A reference can have multiple creators.
-- A creator can be associated with multiple references.
-- ------------------------------------------------------------

create table public.reference_creators (
  reference_id uuid not null
    references public.references(id) on delete cascade,

  creator_id uuid not null
    references public.creators(id) on delete cascade,

  role text,

  created_at timestamptz not null default now(),

  primary key (reference_id, creator_id)
);


-- ------------------------------------------------------------
-- SUBJECTS
-- Reusable concepts associated with references.
-- ------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  name text not null,

  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- REFERENCE ↔ SUBJECT
-- ------------------------------------------------------------

create table public.reference_subjects (
  reference_id uuid not null
    references public.references(id) on delete cascade,

  subject_id uuid not null
    references public.subjects(id) on delete cascade,

  primary key (reference_id, subject_id)
);


-- ------------------------------------------------------------
-- REFERENCE ↔ RESEARCH SPACE
-- References exist independently and can belong to
-- multiple research spaces.
-- ------------------------------------------------------------

create table public.reference_spaces (
  reference_id uuid not null
    references public.references(id) on delete cascade,

  research_space_id uuid not null
    references public.research_spaces(id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key (reference_id, research_space_id)
);


-- ------------------------------------------------------------
-- NOTES
--
-- note        = personal interpretation
-- observation = something noticed
-- question    = something being investigated
-- annotation  = marginal/comment-style thought
-- ------------------------------------------------------------

create table public.notes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,

  reference_id uuid references public.references(id) on delete cascade,
  research_space_id uuid
    references public.research_spaces(id) on delete cascade,

  content text not null,

  kind text not null default 'note'
    check (kind in (
      'note',
      'observation',
      'question',
      'annotation'
    )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A note must belong to at least one research object.
  check (
    reference_id is not null
    or research_space_id is not null
  )
);


-- ------------------------------------------------------------
-- REFERENCE RELATIONSHIPS
-- Relationships between references.
-- ------------------------------------------------------------

create table public.reference_relationships (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,

  from_reference_id uuid not null
    references public.references(id) on delete cascade,

  to_reference_id uuid not null
    references public.references(id) on delete cascade,

  relationship_type text not null,

  note text,

  created_at timestamptz not null default now(),

  check (from_reference_id <> to_reference_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index references_user_id_idx
  on public.references(user_id);

create index research_spaces_user_id_idx
  on public.research_spaces(user_id);

create index sources_user_id_idx
  on public.sources(user_id);

create index subjects_user_id_idx
  on public.subjects(user_id);

create index reference_creators_creator_id_idx
  on public.reference_creators(creator_id);

create index reference_relationships_from_idx
  on public.reference_relationships(from_reference_id);

create index reference_relationships_to_idx
  on public.reference_relationships(to_reference_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.research_spaces enable row level security;
alter table public.references enable row level security;
alter table public.reference_media enable row level security;
alter table public.sources enable row level security;
alter table public.reference_sources enable row level security;
alter table public.creators enable row level security;
alter table public.reference_creators enable row level security;
alter table public.subjects enable row level security;
alter table public.reference_subjects enable row level security;
alter table public.reference_spaces enable row level security;
alter table public.notes enable row level security;
alter table public.reference_relationships enable row level security;


-- ============================================================
-- PROFILE POLICIES
-- ============================================================

create policy "users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


-- ============================================================
-- RESEARCH SPACE POLICIES
-- ============================================================

create policy "users can manage their own research spaces"
on public.research_spaces
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- REFERENCE POLICIES
-- ============================================================

create policy "users can manage their own references"
on public.references
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- SOURCE POLICIES
-- ============================================================

create policy "users can manage their own sources"
on public.sources
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- SUBJECT POLICIES
-- ============================================================

create policy "users can manage their own subjects"
on public.subjects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- CREATOR POLICIES
-- ============================================================

create policy "authenticated users can view creators"
on public.creators
for select
to authenticated
using (true);

create policy "authenticated users can create creators"
on public.creators
for insert
to authenticated
with check (true);


-- ============================================================
-- CHILD TABLE POLICIES
--
-- Access is granted through ownership of the associated
-- reference or research space.
-- ============================================================

create policy "users can manage media for their references"
on public.reference_media
for all
to authenticated
using (
  exists (
    select 1
    from public.references r
    where r.id = reference_media.reference_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_media.reference_id
      and r.user_id = auth.uid()
  )
);


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
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_sources.reference_id
      and r.user_id = auth.uid()
  )
);


create policy "users can manage reference creators"
on public.reference_creators
for all
to authenticated
using (
  exists (
    select 1
    from public.references r
    where r.id = reference_creators.reference_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_creators.reference_id
      and r.user_id = auth.uid()
  )
);


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
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_subjects.reference_id
      and r.user_id = auth.uid()
  )
);


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
)
with check (
  exists (
    select 1
    from public.references r
    where r.id = reference_spaces.reference_id
      and r.user_id = auth.uid()
  )
);


create policy "users can manage their own notes"
on public.notes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


create policy "users can manage their own relationships"
on public.reference_relationships
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);