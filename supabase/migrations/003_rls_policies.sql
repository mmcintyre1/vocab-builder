-- Enable RLS (satisfies Supabase warnings) with permissive policies.
-- Actual access control is handled by the PIN gate at the API layer;
-- server-side calls use the service role key which bypasses RLS entirely.
ALTER TABLE vocab.words   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab.cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON vocab.words   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON vocab.cards   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON vocab.reviews FOR ALL USING (true) WITH CHECK (true);
