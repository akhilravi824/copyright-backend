const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slccdyjixpmstlhveagk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY2NkeWppeHBtc3RsaHZlYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODc0MjEsImV4cCI6MjA3NTM2MzQyMX0.6H9CVWzYybK3mJNHeo-B2T-pYqBeBg40UVT8lfQ_Ev4';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
