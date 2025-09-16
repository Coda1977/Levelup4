import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exxildftqhnlupxdlqfn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function analyzeDatabase() {
  console.log('=== ANALYZING DATABASE STRUCTURE ===\n');

  // 1. Check all user-related tables
  console.log('1. USER-RELATED TABLES:');

  // Alternative: check what tables exist
  let userProfiles, users, userProgress;

  try {
    const profileResult = await supabase.from('user_profiles').select('*').limit(0);
    userProfiles = profileResult.data;
  } catch (e) {
    userProfiles = null;
  }

  try {
    const usersResult = await supabase.from('users').select('*').limit(0);
    users = usersResult.data;
  } catch (e) {
    users = null;
  }

  try {
    const progressResult = await supabase.from('user_progress').select('*').limit(0);
    userProgress = progressResult.data;
  } catch (e) {
    userProgress = null;
  }

  console.log('Tables found:');
  console.log('- public.user_profiles:', userProfiles !== null ? 'EXISTS' : 'NOT FOUND');
  console.log('- public.users:', users !== null ? 'EXISTS' : 'NOT FOUND');
  console.log('- public.user_progress:', userProgress !== null ? 'EXISTS' : 'NOT FOUND');

  // 2. Get sample data to understand structure
  console.log('\n2. CHECKING TABLE STRUCTURES:\n');

  // Check user_profiles structure
  const { data: profileSample } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);

  if (profileSample && profileSample.length > 0) {
    console.log('user_profiles columns:', Object.keys(profileSample[0]));
  }

  // Check users structure if exists
  if (users !== null) {
    const { data: userSample } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (userSample && userSample.length > 0) {
      console.log('users columns:', Object.keys(userSample[0]));
    }
  }

  // Check user_progress structure
  const { data: progressSample } = await supabase
    .from('user_progress')
    .select('*')
    .limit(1);

  if (progressSample && progressSample.length > 0) {
    console.log('user_progress columns:', Object.keys(progressSample[0]));
  }

  // 3. Check auth.users
  console.log('\n3. CHECKING AUTH.USERS:\n');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authUsers) {
    console.log(`Found ${authUsers.users.length} users in auth.users`);
    if (authUsers.users.length > 0) {
      console.log('Sample auth user ID:', authUsers.users[0].id);
    }
  }

  // 4. Check for orphaned records
  console.log('\n4. CHECKING FOR DATA ISSUES:\n');

  // Count records in each table
  const { count: profileCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  const { count: progressCount } = await supabase
    .from('user_progress')
    .select('*', { count: 'exact', head: true });

  if (users !== null) {
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    console.log('public.users count:', userCount);
  }

  console.log('user_profiles count:', profileCount);
  console.log('user_progress count:', progressCount);
  console.log('auth.users count:', authUsers?.users.length || 0);

  // 5. Check for missing profiles
  if (authUsers && authUsers.users.length > 0) {
    console.log('\n5. CHECKING USER SYNC ISSUES:\n');

    for (const authUser of authUsers.users.slice(0, 5)) { // Check first 5 users
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log(`User ${authUser.email}: Profile ${profile ? 'EXISTS' : 'MISSING'}`);
    }
  }
}

analyzeDatabase().catch(console.error);