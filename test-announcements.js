// Test script to verify announcement functionality
// Run this with: node test-announcements.js

const { createClient } = require('@supabase/supabase-js');

// Configuration - update these with your actual values
const supabaseUrl = 'http://localhost:54321'; // Default local Supabase URL
const supabaseServiceKey = 'your-service-key-here'; // You'll need to get this from Supabase

async function testAnnouncementFlow() {
  console.log('🧪 Testing Announcement Flow...\n');
  
  // Create service client for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Step 1: Check if test users exist
    console.log('📋 Step 1: Checking test users...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      return;
    }
    
    console.log(`✅ Found ${profiles.length} profiles:`);
    profiles.forEach(p => {
      console.log(`   - ${p.full_name} (${p.email}) - Role: ${p.database_role}`);
    });
    
    // Step 2: Check announcements table
    console.log('\n📋 Step 2: Checking announcements table...');
    const { data: announcements, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (announcementError) {
      console.error('❌ Error fetching announcements:', announcementError);
      return;
    }
    
    console.log(`✅ Found ${announcements.length} announcements:`);
    announcements.forEach(a => {
      console.log(`   - "${a.title}" (${a.recipient_count} recipients)`);
    });
    
    // Step 3: Check notifications table
    console.log('\n📋 Step 3: Checking notifications table...');
    const { data: notifications, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_role', 'user')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (notificationError) {
      console.error('❌ Error fetching notifications:', notificationError);
      return;
    }
    
    console.log(`✅ Found ${notifications.length} user notifications:`);
    notifications.forEach(n => {
      console.log(`   - "${n.title}" for user ${n.user_id}`);
    });
    
    // Step 4: Test RLS policies
    console.log('\n📋 Step 4: Testing RLS policies...');
    
    // Get admin user
    const adminUser = profiles.find(p => p.database_role === 'admin');
    const regularUser = profiles.find(p => p.database_role !== 'admin');
    
    if (!adminUser || !regularUser) {
      console.log('⚠️  Need both admin and regular users to test RLS');
      return;
    }
    
    // Test admin creating notification for another user
    const testNotification = {
      user_id: regularUser.id,
      title: 'Test Announcement',
      message: 'This is a test announcement from the test script',
      link_url: '/dashboard',
      target_role: 'user'
    };
    
    // Create admin client (simulating admin JWT)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'X-Admin-Role': 'admin'
        }
      }
    });
    
    const { data: insertResult, error: insertError } = await adminClient
      .from('notifications')
      .insert(testNotification)
      .select();
    
    if (insertError) {
      console.error('❌ Error creating test notification:', insertError);
      console.log('   This indicates the RLS policy fix is needed');
    } else {
      console.log('✅ Successfully created test notification:', insertResult[0].id);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Instructions
console.log('📝 To run this test:');
console.log('1. Make sure your local Supabase is running');
console.log('2. Update the supabaseUrl and supabaseServiceKey variables');
console.log('3. Run: node test-announcements.js');
console.log('\n⚠️  This script requires Docker/Supabase to be running locally');
console.log('If Docker is not available, test manually through the web interface:');
console.log('1. Login as AdminTest@gmail.com');
console.log('2. Create an announcement');
console.log('3. Login as UserTest@gmail.com');
console.log('4. Check if notification appears');
