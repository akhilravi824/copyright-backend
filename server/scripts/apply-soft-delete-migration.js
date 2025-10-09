require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Starting soft delete migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/add-soft-delete-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration SQL loaded');
    console.log('⚠️  Note: This script requires direct SQL execution.');
    console.log('📋 Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ Copy the SQL above and run it in Supabase Dashboard > SQL Editor');
    console.log('📍 URL: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();


