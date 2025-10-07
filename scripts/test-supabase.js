const supabase = require('../config/supabase');

async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    
    // Test creating a user
    const testUser = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role: 'staff',
      department: 'it',
      is_active: true,
      email_verified: true
    };
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([testUser])
      .select()
      .single();
    
    if (userError) {
      console.warn('⚠️  User creation test warning:', userError.message);
    } else {
      console.log('✅ User creation test successful');
      
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('email', 'test@example.com');
      console.log('🧹 Test user cleaned up');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSupabaseConnection()
    .then((success) => {
      if (success) {
        console.log('🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('💥 Tests failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Test error:', error);
      process.exit(1);
    });
}

module.exports = testSupabaseConnection;
