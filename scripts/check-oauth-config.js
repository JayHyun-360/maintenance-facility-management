// Check Supabase project configuration via Management API
// Requires service role key for full access

const SUPABASE_URL = 'https://yozddskzyykymidjucqt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvemRkc2t6eXlreW1pZGp1Y3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU3NjUwNywiZXhwIjoyMDg3MTUyNTA3fQ.K-1HCxqZlLVyozVtC05-b2ZFHGiKEAIwAekEjRjLRyc';

async function checkConfig() {
  console.log('=== Checking Supabase OAuth Configuration ===\n');
  
  // Check auth configuration
  const projectRef = 'yozddskzyykymidjucqt';
  
  try {
    // Get project settings via management API
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.ok) {
      const config = await res.json();
      console.log('Auth Config:');
      console.log('  Site URL:', config.site_url);
      console.log('  Redirect URLs:', JSON.stringify(config.redirect_urls, null, 2));
    } else {
      console.log('Could not fetch auth config:', res.status);
      const text = await res.text();
      console.log(text.substring(0, 500));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Check Google OAuth settings
  console.log('\n=== Checking Google Provider ===');
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth/providers/google`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.ok) {
      const config = await res.json();
      console.log('Google Provider Config:');
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log('Could not fetch Google config:', res.status);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

checkConfig();
