-- Add entry_type column to words table
ALTER TABLE vocab.words
  ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'word'
  CHECK (entry_type IN ('word', 'concept'));

-- Add implication to card_type enum
ALTER TYPE vocab.card_type ADD VALUE IF NOT EXISTS 'implication';
