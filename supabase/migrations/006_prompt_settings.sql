-- Configurable generation prompts: global overrides for the system prompt
-- and per-entry-type field instructions used by lib/cards/prompts.ts.
create table vocab.prompt_settings (
  key         text primary key,   -- 'system' | 'fields:word' | 'fields:concept' | 'fields:reference'
  value       jsonb not null,     -- {text} for 'system', {[fieldKey]: instruction} for 'fields:*'
  updated_at  timestamptz not null default now()
);

alter table vocab.prompt_settings enable row level security;
create policy "allow all" on vocab.prompt_settings for all using (true) with check (true);
