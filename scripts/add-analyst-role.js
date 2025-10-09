const fs = require('fs');
const path = require('path');

const migrationSqlPath = path.join(__dirname, '../database/add-analyst-role.sql');

console.log('🚀 Adding Analyst role to the system...');

try {
  const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
  console.log('📝 Migration SQL loaded');
  console.log('⚠️  Note: This script requires direct SQL execution.');
  console.log('📋 Please run the following SQL in your Supabase SQL Editor:\n');
  console.log('================================================================================');
  console.log(migrationSql);
  console.log('================================================================================\n');
  console.log('✅ Copy the SQL above and run it in Supabase Dashboard > SQL Editor');
  console.log('📍 URL: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk/sql/new');
  console.log('\n📧 Test Analyst User Credentials:');
  console.log('   Email: analyst@dsp.com');
  console.log('   Password: analyst123');
  console.log('   Role: analyst (limited access - own incidents only)');
} catch (error) {
  console.error('❌ Error reading migration SQL file:', error);
}


