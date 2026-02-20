// Database Schema Inspector using Supabase Client
// This script will read all SQL that has been run in the database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
    console.log('🔍 Inspecting Supabase database schema...\n');

    try {
        // 1. Get all tables
        console.log('📋 Tables:');
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_schema, table_name, table_type')
            .in('table_schema', ['public'])
            .neq('table_name', 'pg_%')
            .order('table_schema, table_name');

        if (tablesError) throw tablesError;
        console.table(tables);

        // 2. Get table columns
        console.log('\n📊 Table Columns:');
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select(`
                table_schema,
                table_name,
                column_name,
                ordinal_position,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            `)
            .in('table_schema', ['public'])
            .order('table_schema, table_name, ordinal_position');

        if (columnsError) throw columnsError;
        
        // Group by table
        const columnsByTable = {};
        columns.forEach(col => {
            const key = `${col.table_schema}.${col.table_name}`;
            if (!columnsByTable[key]) columnsByTable[key] = [];
            columnsByTable[key].push(col);
        });

        Object.keys(columnsByTable).forEach(table => {
            console.log(`\n${table}:`);
            console.table(columnsByTable[table]);
        });

        // 3. Get functions
        console.log('\n⚙️ Functions:');
        const { data: functions, error: functionsError } = await supabase
            .from('information_schema.routines')
            .select('routine_schema, routine_name, routine_type, external_language')
            .in('routine_schema', ['public'])
            .order('routine_schema, routine_name');

        if (functionsError) throw functionsError;
        console.table(functions);

        // 4. Get triggers
        console.log('\n🔧 Triggers:');
        const { data: triggers, error: triggersError } = await supabase
            .from('information_schema.triggers')
            .select('trigger_schema, trigger_name, event_manipulation, event_object_table, action_timing')
            .in('trigger_schema', ['public'])
            .order('trigger_schema, event_object_table, trigger_name');

        if (triggersError) throw triggersError;
        console.table(triggers);

        // 5. Get RLS policies
        console.log('\n🔒 RLS Policies:');
        const { data: policies, error: policiesError } = await supabase
            .from('pg_policies')
            .select('schemaname, tablename, policyname, permissive, roles, cmd')
            .eq('schemaname', 'public')
            .order('schemaname, tablename, policyname');

        if (policiesError) throw policiesError;
        console.table(policies);

        // 6. Get constraints
        console.log('\n🔗 Constraints:');
        const { data: constraints, error: constraintsError } = await supabase
            .from('information_schema.table_constraints')
            .select('constraint_schema, constraint_name, table_name, constraint_type')
            .in('constraint_schema', ['public'])
            .order('constraint_schema, table_name, constraint_name');

        if (constraintsError) throw constraintsError;
        console.table(constraints);

        // 7. Generate CREATE TABLE statements
        console.log('\n📝 Generated SQL:');
        Object.keys(columnsByTable).forEach(table => {
            const [schema, tableName] = table.split('.');
            const cols = columnsByTable[table];
            
            let createSQL = `CREATE TABLE ${schema}.${tableName} (\n`;
            const columnDefs = cols.map(col => {
                let def = `    ${col.column_name} ${col.data_type}`;
                if (col.character_maximum_length) {
                    def += `(${col.character_maximum_length})`;
                }
                if (col.is_nullable === 'NO') {
                    def += ' NOT NULL';
                }
                if (col.column_default) {
                    def += ` DEFAULT ${col.column_default}`;
                }
                return def;
            });
            createSQL += columnDefs.join(',\n');
            createSQL += '\n);';
            
            console.log(`\n-- ${table}`);
            console.log(createSQL);
        });

    } catch (error) {
        console.error('❌ Error inspecting database:', error.message);
        process.exit(1);
    }
}

inspectDatabase();
