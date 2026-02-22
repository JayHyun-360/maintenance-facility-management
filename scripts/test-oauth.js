// Test OAuth callback flow simulation
const SUPABASE_URL = 'https://yozddskzyykymidjucqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvemRkc2t6eXlreW1pZGp1Y3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzY1MDcsImV4cCI6MjA4NzE1MjUwN30.QLv4vecwVPEKsPUWaega-wvvqNkovspVTD82RQKO3gM';

async function testOAuthFlow() {
  console.log('=== Testing OAuth Configuration ===\n');
  
  // 1. Check Supabase Auth settings
  console.log('1. Checking Supabase Auth configuration...');
  try {
    const settingsRes = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    const settings = await settingsRes.json();
    console.log('Auth Settings:', JSON.stringify(settings, null, 2).substring(0, 500));
  } catch (e) {
    console.log('Could not fetch auth settings:', e.message);
  }
  
  // 2. Check if Google provider is configured
  console.log('\n2. Checking Google OAuth provider...');
  try {
    const providersRes = await fetch(`${SUPABASE_URL}/auth/v1/providers`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    const providers = await providersRes.json();
    const google = providers.find(p => p.name === 'google');
    if (google) {
      console.log('✅ Google provider configured');
      console.log('   Client ID:', google.client_id?.substring(0, 20) + '...');
    } else {
      console.log('❌ Google provider NOT found');
    }
  } catch (e) {
    console.log('Could not fetch providers:', e.message);
  }
  
  // 3. Check profiles table
  console.log('\n3. Checking profiles table...');
  try {
    const profilesRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=count&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    if (profilesRes.ok) {
      console.log('✅ Profiles table accessible');
    } else {
      console.log('❌ Profiles table error:', profilesRes.status);
    }
  } catch (e) {
    console.log('Could not access profiles:', e.message);
  }
  
  // 4. Check trigger function exists
  console.log('\n4. Checking handle_new_user function...');
  try {
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/handle_new_user`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    // This should fail because we're not calling it correctly, but we can check if it exists
    console.log('RPC response status:', rpcRes.status);
  } catch (e) {
    console.log('RPC check:', e.message);
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\n🌐 Live site: https://maintenance-facility-management.vercel.app');
  console.log('📝 Test Google OAuth manually by visiting the login page');
}

testOAuthFlow();
