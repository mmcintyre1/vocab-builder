-- Extend entry_type to include 'reference'
ALTER TABLE vocab.words
  DROP CONSTRAINT IF EXISTS words_entry_type_check;

ALTER TABLE vocab.words
  ADD CONSTRAINT words_entry_type_check
  CHECK (entry_type IN ('word', 'concept', 'reference'));

-- Add context and significance to card_type enum
ALTER TYPE vocab.card_type ADD VALUE IF NOT EXISTS 'context';
ALTER TYPE vocab.card_type ADD VALUE IF NOT EXISTS 'significance';
