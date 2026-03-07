-- ── Run this in Supabase SQL Editor AFTER running supabase-schema.sql ─────────

-- Atomic vote increment function (prevents race conditions)
create or replace function increment_vote(p_matchup_id integer, p_choice text)
returns void
language plpgsql
security definer
as $$
begin
  if p_choice = 'a' then
    update matchups set votes_a = votes_a + 1 where id = p_matchup_id;
  elsif p_choice = 'b' then
    update matchups set votes_b = votes_b + 1 where id = p_matchup_id;
  end if;
end;
$$;

-- Allow anyone (anon role) to call this function
grant execute on function increment_vote(integer, text) to anon;
