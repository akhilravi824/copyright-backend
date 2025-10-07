const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function createTablesSimple() {
  try {
    console.log('🚀 Creating Supabase tables using simple approach...');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase credentials');
      console.log('Please update your .env file with real Supabase keys:');
      console.log('1. Go to: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk');
      console.log('2. Click Settings → API');
      console.log('3. Copy the anon public key and service_role key');
      console.log('4. Update .env file with real keys');
      return false;
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test connection by trying to query users table
    console.log('🧪 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError && testError.code === 'PGRST205') {
      console.log('📋 Tables need to be created.');
      console.log('');
      console.log('🔧 Please run this SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('1. Go to: https://supabase.com/dashboard/project/slccdyjixpmstlhveagk');
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Copy and paste the SQL from: server/database/complete-schema.sql');
      console.log('4. Click "Run" to execute');
      console.log('');
      console.log('Or provide the service_role key to create tables programmatically.');
      return false;
    }
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      console.log('Please check your Supabase API keys in the .env file');
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('✅ Tables already exist!');
    
    // Test inserting admin user
    console.log('👤 Testing admin user creation...');
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .upsert({
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@dsp.com',
        password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
        role: 'admin',
        department: 'management',
        is_active: true,
        email_verified: true
      }, { onConflict: 'email' });
    
    if (adminError) {
      console.warn('⚠️  Admin user creation warning:', adminError.message);
    } else {
      console.log('✅ Admin user created/updated successfully');
    }
    
    console.log('🎉 Database setup completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  createTablesSimple()
    .then((success) => {
      if (success) {
        console.log('🎉 Database setup completed!');
        process.exit(0);
      } else {
        console.log('📋 Please follow the instructions above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Setup error:', error);
      process.exit(1);
    });
}

module.exports = createTablesSimple;
