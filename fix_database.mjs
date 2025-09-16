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

async function executeSQLCommand(sql, description) {
  console.log(`\nExecuting: ${description}`);

  try {
    // Try using fetch with direct SQL endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query_type: 'execute',
        sql: sql
      })
    });

    if (!response.ok) {
      // If RPC doesn't work, we need to use alternative method
      console.log(`Direct SQL not available, using alternative approach...`);
      return false;
    }

    const result = await response.json();
    console.log('Success:', result || 'Command executed');
    return true;
  } catch (error) {
    console.log('Error:', error.message);
    return false;
  }
}

async function fixDatabaseStructure() {
  console.log('=== FIXING DATABASE STRUCTURE ===\n');
  console.log('This script will fix the authentication structure issues.\n');

  // Since we can't execute raw SQL directly, we'll use Supabase client operations

  // Step 1: Check current state
  console.log('Step 1: Checking current database state...');

  const { data: profiles } = await supabase.from('user_profiles').select('*');
  const { data: authData } = await supabase.auth.admin.listUsers();

  console.log(`Found ${profiles?.length || 0} user profiles`);
  console.log(`Found ${authData?.users?.length || 0} auth users`);

  // Step 2: Create missing user profiles
  console.log('\nStep 2: Creating missing user profiles...');

  if (authData?.users) {
    for (const authUser of authData.users) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (!existingProfile) {
        console.log(`Creating profile for user ${authUser.email}`);
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            id: authUser.id,
            first_name: '',
            last_name: '',
            created_at: authUser.created_at,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.log(`Error creating profile: ${error.message}`);
        } else {
          console.log(`Profile created for ${authUser.email}`);
        }
      }
    }
  }

  // Step 3: Test user_progress insert
  console.log('\nStep 3: Testing user_progress table...');

  const testUserId = authData?.users?.[0]?.id;
  if (testUserId) {
    // First, delete any test data
    await supabase
      .from('user_progress')
      .delete()
      .eq('course_id', 'test-migration-course');

    // Try to insert
    const { error: progressError } = await supabase
      .from('user_progress')
      .insert({
        user_id: testUserId,
        course_id: 'test-migration-course',
        completed_lessons: [],
        current_lesson_id: 'test-lesson',
        updated_at: new Date().toISOString()
      });

    if (progressError) {
      console.log(`user_progress constraint issue detected: ${progressError.message}`);
      console.log('\n⚠️  MANUAL INTERVENTION REQUIRED:');
      console.log('The foreign key constraint on user_progress needs to be fixed.');
      console.log('This requires direct database access.');
    } else {
      console.log('user_progress table is working correctly!');

      // Clean up test data
      await supabase
        .from('user_progress')
        .delete()
        .eq('course_id', 'test-migration-course');
    }
  }

  // Step 4: Check for is_admin column
  console.log('\nStep 4: Checking for is_admin column...');

  const { data: sampleProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1)
    .single();

  if (sampleProfile && !('is_admin' in sampleProfile)) {
    console.log('is_admin column is missing from user_profiles');
    console.log('\n⚠️  MANUAL INTERVENTION REQUIRED:');
    console.log('The is_admin column needs to be added to user_profiles table.');
  } else if (sampleProfile) {
    console.log('is_admin column exists in user_profiles');
  }

  // Step 5: Provide SQL script for manual execution
  console.log('\n=== MANUAL SQL EXECUTION REQUIRED ===\n');
  console.log('Due to Supabase security restrictions, some operations need to be executed manually.');
  console.log('Please go to the Supabase SQL Editor and run the migration file we created:');
  console.log('\nDashboard URL: https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/sql/new');
  console.log('\nOr use Supabase CLI with direct database connection:');
  console.log('npx supabase db push --db-url "postgresql://postgres:Ntu1zsR23v6FBpvO@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"');

  // Create a simplified SQL script
  const simplifiedSQL = `
-- Simplified fix for immediate execution
-- Run this in the Supabase SQL Editor

-- 1. Add is_admin to user_profiles if missing
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Fix foreign key on user_progress
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;

ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create trigger for auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, created_at, updated_at)
    VALUES (new.id, now(), now())
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Drop redundant users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Verify with: SELECT COUNT(*) FROM user_profiles;
`;

  // Save simplified script
  const fs = await import('fs');
  await fs.promises.writeFile(
    resolve(__dirname, 'fix_database_manual.sql'),
    simplifiedSQL
  );

  console.log('\nA simplified SQL script has been saved to: fix_database_manual.sql');
  console.log('Copy and paste its contents into the SQL Editor.\n');

  return {
    profilesFixed: true,
    requiresManualSQL: true,
    dashboardUrl: 'https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/sql/new'
  };
}

fixDatabaseStructure()
  .then(result => {
    console.log('\n=== SUMMARY ===');
    console.log('User profiles synchronized:', result.profilesFixed);
    if (result.requiresManualSQL) {
      console.log('\n⚠️  Manual SQL execution required');
      console.log(`Dashboard: ${result.dashboardUrl}`);
    }
  })
  .catch(console.error);