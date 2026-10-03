-- gte-small similarities are compressed: unrelated English sentences still score
-- ~0.76. Testing showed related examples at 0.81-0.89 and unrelated at 0.76-0.78,
-- so the default threshold moves to 0.80. Raw scores are now returned so the
-- backend can log them and the team can re-tune once the real dataset lands.

drop function if exists public.match_tutoring_examples(
  text, extensions.vector, text, text, text, integer, double precision, boolean
);

create function public.match_tutoring_examples(
  query_text text default null,
  query_embedding extensions.vector(384) default null,
  filter_topic text default null,
  preferred_difficulty text default null,
  preferred_style text default null,
  match_count integer default 3,
  min_similarity double precision default 0.80,
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
  score double precision,
  semantic_similarity double precision,
  keyword_score double precision
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
      end as kw_score,
      case
        when query_embedding is not null and e.embedding is not null
          then 1 - (e.embedding operator(extensions.<=>) query_embedding)
      end as sem_score,
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
        when c.sem_score >= min_similarity then 'semantic'
        when c.kw_score > 0 then 'keyword'
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
        when 'topic' then 1 + greatest(coalesce(l.sem_score, 0), l.kw_score)
        when 'semantic' then l.sem_score
        when 'keyword' then l.kw_score
        else 0
      end + l.preference_bonus
    )::double precision as score,
    l.sem_score::double precision as semantic_similarity,
    l.kw_score::double precision as keyword_score
  from labeled as l
  order by
    (l.match_type <> 'fallback') desc,
    (l.review_status = 'native_reviewed') desc,
    score desc,
    coalesce(l.sem_score, 0) desc,
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
