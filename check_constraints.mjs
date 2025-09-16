import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exxildftqhnlupxdlqfn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkConstraints() {
  console.log('=== CHECKING CONSTRAINTS AND STRUCTURE ===\n');

  // Check columns in users table
  const { data: usersColumns } = await supabase.rpc('run_sql', {
    query: `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `
  }).single();

  // Check if is_admin exists in any table
  const { data: adminColumns } = await supabase.rpc('run_sql', {
    query: `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE column_name = 'is_admin' AND table_schema = 'public'
    `
  }).single();

  // Check foreign key on user_progress
  const { data: fkConstraints } = await supabase.rpc('run_sql', {
    query: `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_progress'
    `
  }).single();

  // Check existing triggers
  const { data: triggers } = await supabase.rpc('run_sql', {
    query: `
      SELECT
        t.tgname AS trigger_name,
        pg_get_functiondef(t.tgfoid) AS function_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname IN ('users', 'user_profiles')
        AND NOT t.tgisinternal
    `
  }).single();

  console.log('Users table columns:', usersColumns);
  console.log('\nTables with is_admin column:', adminColumns);
  console.log('\nForeign key constraints on user_progress:', fkConstraints);
  console.log('\nExisting triggers:', triggers);
}

// Try direct query if RPC fails
async function directQuery() {
  // Test a direct SQL query with raw response
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/run_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: "SELECT version()"
      })
    });

    if (!response.ok) {
      // RPC function doesn't exist, we'll use migrations
      console.log('\nRPC function not available. Will use migration approach.\n');

      // Let's check what we can see from the tables directly
      const { data: userData } = await supabase.from('users').select('*').limit(1);
      const { data: profileData } = await supabase.from('user_profiles').select('*').limit(1);

      console.log('Sample from users table:', userData);
      console.log('Sample from user_profiles table:', profileData);

      // Check if user_progress has proper structure
      try {
        // Try to insert a test record to see the error
        const { error } = await supabase.from('user_progress').insert({
          user_id: '21e5243c-9887-4783-b63f-cdbd401ced7c', // The existing user ID
          course_id: 'test-course',
          completed_lessons: [],
          current_lesson_id: 'test-lesson'
        });

        if (error) {
          console.log('\nuser_progress insert error (this reveals the constraint issue):', error.message);
        }
      } catch (e) {
        console.log('Error testing user_progress:', e.message);
      }
    }
  } catch (error) {
    console.log('Direct query approach:', error.message);
  }
}

checkConstraints().catch(async (e) => {
  console.log('RPC method failed, trying direct approach...');
  await directQuery();
});