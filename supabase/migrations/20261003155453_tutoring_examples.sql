-- Bikol tutor: teaching-reference dataset + retrieval for few-shot prompting.
--
-- Rows mirror Teammate 4's `data/bikol_examples.json` handoff schema so the JSON
-- can be upserted as-is (plus optional `student_question` and `style`).
-- The mobile app never talks to Supabase directly: only the backend (secret key)
-- and Edge Functions can read or write this data.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.tutoring_examples (
  id text primary key,
  topic text not null,
  subject text,
  difficulty text check (difficulty in ('very_simple', 'simple', 'normal')),
  style text check (style in ('teacher', 'friend', 'ate_kuya')),

  -- English side: used for retrieval (keyword + embedding).
  student_question text,
  english_concept text not null,

  -- Bikol side: passed to the prompt builder as the few-shot demonstration.
  ai_draft_bikol text,
  native_corrected_bikol text,
  bikol_example text,
  bikol_explanation text generated always as (
    coalesce(native_corrected_bikol, ai_draft_bikol)
  ) stored,

  review_status text not null default 'draft'
    check (review_status in ('draft', 'native_reviewed')),
  region_label text,
  review_notes text,
  source_label text not null default 'team_dataset',

  -- Retrieval helpers.
  search_text tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(topic, '')), 'A')
    || setweight(to_tsvector('english'::regconfig, coalesce(student_question, '')), 'B')
    || setweight(to_tsvector('english'::regconfig, coalesce(english_concept, '')), 'C')
    || setweight(to_tsvector('english'::regconfig, coalesce(subject, '')), 'D')
  ) stored,
  embedding extensions.vector(384),
  embedding_model text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An AI draft can never be labeled as native reviewed.
  constraint native_reviewed_requires_correction check (
    review_status <> 'native_reviewed' or native_corrected_bikol is not null
  )
);

comment on table public.tutoring_examples is
  'Native-speaker teaching examples used as few-shot references for the Bikol tutor. Not a closed answer bank.';
comment on column public.tutoring_examples.bikol_explanation is
  'Best available Bikol text: native correction if present, otherwise the unverified AI draft.';
comment on column public.tutoring_examples.embedding is
  'gte-small (384-dim) embedding of topic + student_question + english_concept. Cleared automatically when that text changes.';

create index tutoring_examples_search_text_idx
  on public.tutoring_examples using gin (search_text);
create index tutoring_examples_topic_idx
  on public.tutoring_examples (lower(topic));
-- No vector index: an exact scan is faster and more accurate at 20-50 rows.
-- Add an HNSW index (vector_cosine_ops) if the dataset grows into the thousands.

-- ---------------------------------------------------------------------------
-- Access: backend-only
-- ---------------------------------------------------------------------------

alter table public.tutoring_examples enable row level security;
-- Intentionally no policies: anon/authenticated get nothing. The Express
-- backend and Edge Functions use the secret key (service_role), which bypasses RLS.
revoke all on table public.tutoring_examples from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: updated_at + embedding invalidation
-- ---------------------------------------------------------------------------

create or replace function public.tutoring_examples_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();

  -- If the text that was embedded changes, the old vector is stale.
  if (new.topic, new.student_question, new.english_concept)
       is distinct from (old.topic, old.student_question, old.english_concept)
     and new.embedding is not distinct from old.embedding then
    new.embedding := null;
    new.embedding_model := null;
  end if;

  return new;
end;
$$;

create trigger tutoring_examples_before_update
  before update on public.tutoring_examples
  for each row
  execute function public.tutoring_examples_before_update();

-- ---------------------------------------------------------------------------
-- Retrieval RPC
-- ---------------------------------------------------------------------------
-- Ranks examples for a student question and always returns up to match_count
-- rows, each labeled with how it was matched:
--   topic    - exact topic match (e.g. NFC card TOPIC_GRAVITY -> 'gravity')
--   semantic - cosine similarity >= min_similarity (requires query_embedding)
--   keyword  - shares at least one English keyword with the question
--   fallback - no real match; included only as a teaching-STYLE reference
-- The prompt builder must not treat 'fallback' rows as factual grounding.

create or replace function public.match_tutoring_examples(
  query_text text default null,
  query_embedding extensions.vector(384) default null,
  filter_topic text default null,
  preferred_difficulty text default null,
  preferred_style text default null,
  match_count integer default 3,
  min_similarity double precision default 0.75,
  reviewed_only boolean default true
)
returns table (
  id text,
  topic text,
  subject text,
  difficulty text,
  style text,
  student_question text,
  english_concept text,
  bikol_explanation text,
  bikol_example text,
  review_status text,
  region_label text,
  match_type text,
  score double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      nullif(lower(btrim(filter_topic)), '') as topic,
      -- OR together the question's English lexemes so partial overlap still counts.
      (
        select to_tsquery('simple', string_agg(quote_literal(lexeme), ' | '))
        from unnest(
          tsvector_to_array(to_tsvector('english'::regconfig, coalesce(query_text, '')))
        ) as lexeme
      ) as tsq
  ),
  candidates as (
    select
      e.*,
      coalesce(p.topic is not null and lower(e.topic) = p.topic, false) as topic_hit,
      case
        when p.tsq is not null and e.search_text @@ p.tsq
          then ts_rank_cd(e.search_text, p.tsq, 32)
        else 0
      end as keyword_score,
      case
        when query_embedding is not null and e.embedding is not null
          then 1 - (e.embedding operator(extensions.<=>) query_embedding)
        else 0
      end as semantic_score,
      (case when e.difficulty = preferred_difficulty then 0.05 else 0 end)
        + (case when e.style = preferred_style then 0.05 else 0 end) as preference_bonus
    from public.tutoring_examples as e
    cross join params as p
    where e.bikol_explanation is not null
      and (not reviewed_only or e.review_status = 'native_reviewed')
  ),
  labeled as (
    select
      c.*,
      case
        when c.topic_hit then 'topic'
        when c.semantic_score >= min_similarity then 'semantic'
        when c.keyword_score > 0 then 'keyword'
        else 'fallback'
      end as match_type
    from candidates as c
  )
  select
    l.id,
    l.topic,
    l.subject,
    l.difficulty,
    l.style,
    l.student_question,
    l.english_concept,
    l.bikol_explanation,
    l.bikol_example,
    l.review_status,
    l.region_label,
    l.match_type,
    (
      case l.match_type
        when 'topic' then 1 + greatest(l.semantic_score, l.keyword_score)
        when 'semantic' then l.semantic_score
        when 'keyword' then l.keyword_score
        else 0
      end + l.preference_bonus
    )::double precision as score
  from labeled as l
  order by
    (l.match_type <> 'fallback') desc,
    (l.review_status = 'native_reviewed') desc,
    score desc,
    l.id
  limit greatest(1, least(coalesce(match_count, 3), 10));
$$;

comment on function public.match_tutoring_examples is
  'Topic + keyword + optional pgvector retrieval of few-shot Bikol teaching examples. Rows labeled fallback are style-only references.';

revoke execute on function public.match_tutoring_examples(
  text, extensions.vector, text, text, text, integer, double precision, boolean
) from public, anon, authenticated;
grant execute on function public.match_tutoring_examples(
  text, extensions.vector, text, text, text, integer, double precision, boolean
) to service_role;

revoke execute on function public.tutoring_examples_before_update() from public, anon, authenticated;
