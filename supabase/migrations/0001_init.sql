-- Environment deliverable: minimal fresh schema for proving connectivity.
-- Table 1: the simplest possible "Hello World" proof — type a message, store it, read it back.
create table if not exists test_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

-- Table 2-4: minimal slice of the real Check the Score data model, enough to prove
-- a real GAA score (manually entered or pulled from a tweet) can be stored and displayed.
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  county text not null default 'Cork'
);

create table if not exists fixtures (
  id uuid primary key default gen_random_uuid(),
  home_club text not null,
  away_club text not null,
  competition text,
  venue text,
  scheduled_time timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming','live','full_time','postponed')),
  home_score_goals int not null default 0,
  home_score_points int not null default 0,
  away_score_goals int not null default 0,
  away_score_points int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists score_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id) on delete cascade,
  team text not null check (team in ('home','away')),
  type text not null check (type in ('goal','point')),
  minute int,
  source text not null default 'manual' check (source in ('manual','twitter')),
  created_at timestamptz not null default now()
);

create table if not exists source_tweets (
  id uuid primary key default gen_random_uuid(),
  tweet_id text not null unique,
  author_handle text not null,
  text text not null,
  fixture_id uuid references fixtures(id),
  score_event_id uuid references score_events(id),
  auto_applied boolean not null default false,
  fetched_at timestamptz not null default now()
);

-- Enable realtime so the viewer page updates live without polling.
alter publication supabase_realtime add table fixtures;
alter publication supabase_realtime add table score_events;
