// Quick database state check via REST API
const SUPABASE_URL = 'https://yozddskzyykymidjucqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvemRkc2t6eXlreW1pZGp1Y3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzY1MDcsImV4cCI6MjA4NzE1MjUwN30.QLv4vecwVPEKsPUWaega-wvvqNkovspVTD82RQKO3gM';

async function checkDatabase() {
  try {
    // Try to query profiles table
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=count&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    console.log('Profiles table check:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.status === 404) {
      console.log('\n❌ PROFILES TABLE DOES NOT EXIST');
    } else if (response.ok) {
      console.log('\n✅ PROFILES TABLE EXISTS');
    } else {
      console.log('\n⚠️ UNEXPECTED RESPONSE');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();
