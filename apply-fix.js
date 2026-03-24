import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('Applying theme_preference default fix...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE public.profiles ALTER COLUMN theme_preference SET DEFAULT 'system';"
  });
  
  if (error) {
    console.log('RPC exec_sql not available, trying direct approach...');
    
    // Try using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ sql: "ALTER TABLE public.profiles ALTER COLUMN theme_preference SET DEFAULT 'system';" })
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.log('Direct REST API also failed:', err);
      console.log('\nPlease run this SQL manually in Supabase dashboard:');
      console.log("ALTER TABLE public.profiles ALTER COLUMN theme_preference SET DEFAULT 'system';");
    }
  } else {
    console.log('Migration applied successfully!');
  }
}

applyMigration();
