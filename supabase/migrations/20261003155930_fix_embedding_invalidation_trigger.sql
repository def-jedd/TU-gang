-- With search_path = '' the pgvector equality operator is not resolvable,
-- which made every UPDATE on tutoring_examples fail. Compare text forms instead.

create or replace function public.tutoring_examples_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();

  -- If the text that was embedded changes, the old vector is stale
  -- (unless this same update is writing a fresh embedding).
  if (new.topic, new.student_question, new.english_concept)
       is distinct from (old.topic, old.student_question, old.english_concept)
     and new.embedding::text is not distinct from old.embedding::text then
    new.embedding := null;
    new.embedding_model := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.tutoring_examples_before_update() from public, anon, authenticated;
