const supabase = require('../config/supabase');

async function createTablesWithClient() {
  try {
    console.log('🚀 Creating Supabase tables using client...');
    
    // Test connection first
    console.log('🧪 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError && testError.code === 'PGRST205') {
      console.log('📋 Tables need to be created. Please run the SQL schema in Supabase dashboard.');
      console.log('');
      console.log('📋 Instructions:');
      console.log('1. Go to: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk');
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Copy and paste the SQL from: server/database/complete-schema.sql');
      console.log('4. Click "Run" to execute');
      console.log('5. Then run: node scripts/migrate-to-supabase.js');
      return false;
    }
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('✅ Tables already exist or created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  createTablesWithClient()
    .then((success) => {
      if (success) {
        console.log('🎉 Database ready!');
        process.exit(0);
      } else {
        console.log('📋 Please follow the instructions above to create tables.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Setup error:', error);
      process.exit(1);
    });
}

module.exports = createTablesWithClient;