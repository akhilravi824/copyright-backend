-- Reverse Image Search tables (Supabase/Postgres)
CREATE TABLE IF NOT EXISTS reverse_image_queries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  query TEXT NOT NULL,
  original_filename TEXT,
  original_storage_url TEXT,
  phash TEXT,
  clip_embedding REAL[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reverse_image_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID REFERENCES reverse_image_queries(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source TEXT,
  title TEXT,
  thumbnail_url TEXT,
  similarity NUMERIC,
  phash_similarity NUMERIC,
  clip_similarity NUMERIC,
  classification TEXT,
  classification_score NUMERIC,
  potential_infringement BOOLEAN DEFAULT FALSE,
  text_snippet TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reverse_query_user ON reverse_image_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_reverse_results_query ON reverse_image_results(query_id);
