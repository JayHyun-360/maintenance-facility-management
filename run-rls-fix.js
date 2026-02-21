const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL() {
    console.log('🔧 Executing RLS fix SQL...');
    
    try {
        // Read the SQL file
        const sqlFile = path.join(__dirname, 'fix-rls-circuit-breaker.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('📄 SQL file loaded, executing...');
        
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`🔄 Executing: ${statement.substring(0, 50)}...`);
                
                const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
                
                if (error) {
                    console.error(`❌ Error executing statement: ${error.message}`);
                    console.log(`📝 Statement: ${statement}`);
                } else {
                    console.log(`✅ Statement executed successfully`);
                }
            }
        }
        
        console.log('🎉 RLS fix completed!');
        
    } catch (error) {
        console.error('❌ Error executing SQL:', error.message);
        process.exit(1);
    }
}

executeSQL();
