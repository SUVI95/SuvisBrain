-- ============================================================
-- Knuut AI Brain — Neon Database Schema
-- Run this in your Neon SQL Editor (neon.tech dashboard)
-- ============================================================

-- Enable pgvector for semantic memory search
-- If your Neon branch doesn't support it, remove this line and the embedding column below
create extension if not exists vector;

-- ── AGENTS ───────────────────────────────────────────────────
create table agents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  color       text,
  status      text default 'active',
  tick        text,
  created_at  timestamptz default now()
);

-- ── NODES (brain graph nodes) ─────────────────────────────────
create table brain_nodes (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  type        text not null check (type in ('Core','Memory','Conversation','Entity','Skill','Agent')),
  agent_id    uuid references agents(id),
  metadata    jsonb default '{}',
  embedding   vector(1536),   -- for semantic search (optional)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── EDGES (brain graph links) ─────────────────────────────────
create table brain_edges (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid references brain_nodes(id) on delete cascade,
  target_id   uuid references brain_nodes(id) on delete cascade,
  value       int default 1,
  created_at  timestamptz default now()
);

-- ── EPISODES (conversations) ──────────────────────────────────
create table episodes (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references agents(id),
  title       text,
  summary     text,
  language    text default 'fi',
  duration_s  int,
  lead_qualified boolean default false,
  raw_transcript text,
  created_at  timestamptz default now()
);

-- ── ENTITIES ─────────────────────────────────────────────────
create table entities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text,    -- 'lead', 'school', 'company', 'student'
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- ── LEARNERS ──────────────────────────────────────────────────
create table if not exists learners (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text unique,
  mother_tongue text,
  cefr_level   text default 'A1',
  agent_id     uuid references agents(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table episodes add column if not exists learner_id uuid references learners(id);
create index if not exists idx_episodes_learner on episodes(learner_id);

-- ── INDEXES ──────────────────────────────────────────────────
create index on brain_nodes(type);
create index on brain_nodes(agent_id);
create index on brain_edges(source_id);
create index on brain_edges(target_id);
create index on episodes(agent_id);
create index on episodes(created_at);
create index on episodes(learner_id);

-- ── SEED DATA — initial agents ────────────────────────────────
insert into agents (name, role, color) values
  ('Hank',   'Systems Engineer',  '#60a5fa'),
  ('Jules',  'Head of User Face', '#1d9e75'),
  ('Cleo',   'Head of Personal',  '#a78bfa'),
  ('Atlas',  'Head of Research',  '#f59e0b'),
  ('Adrian', 'Video Production',  '#d45a5a'),
  ('Nelli',  'Finnish Language',  '#34d399'),
  ('Nova',   'Sales Qualifier',   '#f472b6');

-- ── SEED DATA — initial learners ────────────────────────────────
insert into learners (name, email, mother_tongue, cefr_level) values
  ('Amira Hassan',   'amira@test.fi',  'Arabic',   'A1'),
  ('Pavel Sorokin',  'pavel@test.fi',  'Russian',  'A2'),
  ('Fatuma Warsame', 'fatuma@test.fi', 'Somali',   'A1'),
  ('Li Wei',         'li@test.fi',     'Mandarin', 'B1')
on conflict (email) do nothing;
