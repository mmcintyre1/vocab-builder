-- Vocab Builder: initial schema

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- words
-- ─────────────────────────────────────────────
create table words (
  id          uuid primary key default gen_random_uuid(),
  word        text not null,
  source      text,                          -- where the user found it
  tags        text[] not null default '{}',  -- free-form tags
  notes       text,
  added_at    timestamptz not null default now(),

  constraint words_word_unique unique (word)
);

create index idx_words_added_at on words (added_at desc);
create index idx_words_tags     on words using gin (tags);

-- ─────────────────────────────────────────────
-- cards
-- ─────────────────────────────────────────────
create type card_type as enum ('definition', 'pronunciation', 'cloze', 'etymology');

create table cards (
  id              uuid primary key default gen_random_uuid(),
  word_id         uuid not null references words (id) on delete cascade,
  type            card_type not null,
  front           text not null,
  back            text not null,
  created_at      timestamptz not null default now(),

  -- FSRS state
  stability       float not null default 0,
  difficulty      float not null default 0,
  reps            integer not null default 0,
  lapses          integer not null default 0,
  last_rating     integer,                               -- 1–4
  last_review     timestamptz,
  next_review     timestamptz not null default now()     -- due immediately
);

create index idx_cards_word_id    on cards (word_id);
create index idx_cards_next_review on cards (next_review asc);

-- ─────────────────────────────────────────────
-- reviews (append-only history)
-- ─────────────────────────────────────────────
create table reviews (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references cards (id) on delete cascade,
  rating       integer not null check (rating between 1 and 4),
  reviewed_at  timestamptz not null default now()
);

create index idx_reviews_card_id on reviews (card_id);
