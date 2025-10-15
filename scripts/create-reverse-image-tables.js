const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY).');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Creating reverse image tables...');

  const sql = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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
  `;

  // Prefer RPC exec if available; else use PostgREST sql function pattern
  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    if (error) throw error;
    console.log('SQL executed via rpc.exec');
  } catch (e) {
    console.warn('rpc.exec not available; attempting via REST is not supported here. Please run SQL in Supabase SQL editor.');
    console.warn('You can also copy from database/reverse-image-schema.sql');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
