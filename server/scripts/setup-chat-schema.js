const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

async function setupChatSchema() {
  console.log('🚀 Setting up chat schema in Supabase...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/chat-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing chat schema SQL...');
    console.log('\n' + '='.repeat(80));
    console.log('SQL TO RUN IN SUPABASE:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ Please run the SQL above in your Supabase SQL Editor');
    console.log('📍 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor');
    console.log('\n💡 Steps:');
    console.log('   1. Copy the SQL above');
    console.log('   2. Navigate to SQL Editor in Supabase Dashboard');
    console.log('   3. Paste the SQL and click "Run"');
    console.log('   4. Verify tables are created: chat_messages, user_presence');
    console.log('\n🎉 Once complete, the chat feature will be fully functional!\n');
    
    // Test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('⚠️  Could not connect to Supabase:', error.message);
    } else {
      console.log('✅ Supabase connection verified');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupChatSchema();
}

module.exports = setupChatSchema;

