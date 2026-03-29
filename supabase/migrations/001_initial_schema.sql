-- Vocab Builder: initial schema
-- Uses a dedicated 'vocab' schema to avoid collisions with other apps

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Schema + permissions
-- ─────────────────────────────────────────────
create schema if not exists vocab;

grant usage on schema vocab to anon, authenticated, service_role;

alter default privileges in schema vocab
  grant all on tables to anon, authenticated, service_role;

alter default privileges in schema vocab
  grant all on sequences to anon, authenticated, service_role;

-- ─────────────────────────────────────────────
-- words
-- ─────────────────────────────────────────────
create table vocab.words (
  id          uuid primary key default gen_random_uuid(),
  word        text not null,
  source      text,                          -- where the user found it
  tags        text[] not null default '{}',  -- free-form tags
  notes       text,
  added_at    timestamptz not null default now(),

  constraint words_word_unique unique (word)
);

create index idx_words_added_at on vocab.words (added_at desc);
create index idx_words_tags     on vocab.words using gin (tags);

-- ─────────────────────────────────────────────
-- cards
-- ─────────────────────────────────────────────
create type vocab.card_type as enum ('definition', 'pronunciation', 'cloze', 'etymology');

create table vocab.cards (
  id              uuid primary key default gen_random_uuid(),
  word_id         uuid not null references vocab.words (id) on delete cascade,
  type            vocab.card_type not null,
  front           text not null,
  back            text not null,
  created_at      timestamptz not null default now(),

  -- FSRS state
  stability       float not null default 0,
  difficulty      float not null default 0,
  reps            integer not null default 0,
  lapses          integer not null default 0,
  last_rating     integer,
  last_review     timestamptz,
  next_review     timestamptz not null default now()
);

create index idx_cards_word_id     on vocab.cards (word_id);
create index idx_cards_next_review on vocab.cards (next_review asc);

-- ─────────────────────────────────────────────
-- reviews (append-only history)
-- ─────────────────────────────────────────────
create table vocab.reviews (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references vocab.cards (id) on delete cascade,
  rating       integer not null check (rating between 1 and 4),
  reviewed_at  timestamptz not null default now()
);

create index idx_reviews_card_id on vocab.reviews (card_id);
