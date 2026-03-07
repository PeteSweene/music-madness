-- ── Music Madness Schema ─────────────────────────────────────────────────────
-- Run this entire file in Supabase Dashboard → SQL Editor → New Query

-- Matchups table: one row per head-to-head matchup
create table if not exists matchups (
  id          integer primary key,
  song1_id    integer not null,
  song2_id    integer not null,
  day         integer not null,        -- which day this matchup goes live
  region      text not null,           -- East | West | North | South
  votes_a     integer not null default 0,
  votes_b     integer not null default 0,
  winner      text default null,       -- 'a' | 'b' | null (set manually when day ends)
  locked      boolean not null default false  -- true once day has passed
);

-- Votes table: one row per user vote
create table if not exists votes (
  id          uuid primary key default gen_random_uuid(),
  matchup_id  integer not null references matchups(id),
  voter_token text not null,           -- anonymous UUID stored in localStorage
  choice      text not null,           -- 'a' or 'b'
  created_at  timestamptz not null default now(),
  -- Enforce one vote per user per matchup
  unique(matchup_id, voter_token)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table matchups enable row level security;
alter table votes enable row level security;

-- Anyone can read matchups
create policy "matchups: public read"
  on matchups for select using (true);

-- Anyone can read votes (needed for real-time count updates)
create policy "votes: public read"
  on votes for select using (true);

-- Anyone can insert a vote (uniqueness constraint prevents double voting)
create policy "votes: public insert"
  on votes for insert with check (true);

-- ── Seed matchup data ─────────────────────────────────────────────────────────
-- This mirrors the PAIRS array in the React app
insert into matchups (id, song1_id, song2_id, day, region, votes_a, votes_b, winner, locked) values
  -- Day 1 (locked)
  (1,  1,  2, 1, 'East',  142, 58,  'a', true),
  (2,  17, 18, 1, 'West',  91, 109, 'b', true),
  (3,  33, 34, 1, 'North', 128, 72, 'a', true),
  (4,  49, 50, 1, 'South', 155, 45, 'a', true),
  -- Day 2 (locked)
  (5,  3,  4,  2, 'East',  77, 123, 'b', true),
  (6,  19, 20, 2, 'West',  115, 85, 'a', true),
  (7,  35, 36, 2, 'North', 98, 102, 'b', true),
  (8,  51, 52, 2, 'South', 133, 67, 'a', true),
  -- Day 3 (live — no votes yet, no winner)
  (9,  5,  6,  3, 'East',  0, 0, null, false),
  (10, 21, 22, 3, 'West',  0, 0, null, false),
  (11, 37, 38, 3, 'North', 0, 0, null, false),
  (12, 53, 54, 3, 'South', 0, 0, null, false),
  -- Day 4
  (13, 7,  8,  4, 'East',  0, 0, null, false),
  (14, 23, 24, 4, 'West',  0, 0, null, false),
  (15, 39, 40, 4, 'North', 0, 0, null, false),
  (16, 55, 56, 4, 'South', 0, 0, null, false),
  -- Day 5
  (17, 9,  10, 5, 'East',  0, 0, null, false),
  (18, 25, 26, 5, 'West',  0, 0, null, false),
  (19, 41, 42, 5, 'North', 0, 0, null, false),
  (20, 57, 58, 5, 'South', 0, 0, null, false),
  -- Day 6
  (21, 11, 12, 6, 'East',  0, 0, null, false),
  (22, 27, 28, 6, 'West',  0, 0, null, false),
  (23, 43, 44, 6, 'North', 0, 0, null, false),
  (24, 59, 60, 6, 'South', 0, 0, null, false),
  -- Day 7
  (25, 13, 14, 7, 'East',  0, 0, null, false),
  (26, 29, 30, 7, 'West',  0, 0, null, false),
  (27, 45, 46, 7, 'North', 0, 0, null, false),
  (28, 61, 62, 7, 'South', 0, 0, null, false),
  -- Day 8
  (29, 15, 16, 8, 'East',  0, 0, null, false),
  (30, 31, 32, 8, 'West',  0, 0, null, false),
  (31, 47, 48, 8, 'North', 0, 0, null, false),
  (32, 63, 64, 8, 'South', 0, 0, null, false)
on conflict (id) do nothing;

-- ── Helper: advance to next day ───────────────────────────────────────────────
-- Run this SQL when you want to close a day and open the next one.
-- Replace 3 with whatever day just ended.
--
-- update matchups set locked = true  where day = 3;
-- update matchups set locked = false where day = 4;
--
-- Then also set the winner manually, e.g.:
-- update matchups set winner = 'a' where id = 9;
