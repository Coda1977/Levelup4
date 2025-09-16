#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

// Try pooler connection
const client = new Client({
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.exxildftqhnlupxdlqfn',
  password: 'Ntu1zsR23v6FBpvO',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixRLSPolicies() {
  try {
    await client.connect();
    console.log('Connected to database successfully\n');

    // First, let's drop all existing policies on user_profiles to start fresh
    console.log('Dropping existing RLS policies...');

    const dropPoliciesQuery = `
      DO $$
      DECLARE
        pol RECORD;
      BEGIN
        FOR pol IN
          SELECT pol.polname
          FROM pg_policy pol
          JOIN pg_class c ON c.oid = pol.polrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'user_profiles'
          AND n.nspname = 'public'
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.polname);
        END LOOP;
      END $$;
    `;

    await client.query(dropPoliciesQuery);
    console.log('Existing policies dropped.\n');

    // Now create new, non-recursive policies
    console.log('Creating new RLS policies...\n');

    // Policy 1: Users can read their own profile
    // Using auth.uid() directly without subqueries to avoid recursion
    const selectPolicy = `
      CREATE POLICY "Users can view own profile"
      ON public.user_profiles
      FOR SELECT
      USING (auth.uid() = id);
    `;

    await client.query(selectPolicy);
    console.log('✓ Created SELECT policy: Users can view own profile');

    // Policy 2: Users can update their own profile
    const updatePolicy = `
      CREATE POLICY "Users can update own profile"
      ON public.user_profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
    `;

    await client.query(updatePolicy);
    console.log('✓ Created UPDATE policy: Users can update own profile');

    // Policy 3: Users can insert their own profile (for initial creation)
    const insertPolicy = `
      CREATE POLICY "Users can insert own profile"
      ON public.user_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
    `;

    await client.query(insertPolicy);
    console.log('✓ Created INSERT policy: Users can insert own profile');

    // Policy 4: Service role bypass (for triggers and admin operations)
    // This uses a role check, not a recursive query
    const servicePolicy = `
      CREATE POLICY "Service role has full access"
      ON public.user_profiles
      FOR ALL
      USING (
        auth.jwt() ->> 'role' = 'service_role'
      );
    `;

    await client.query(servicePolicy);
    console.log('✓ Created SERVICE ROLE policy: Service role has full access');

    // Optional: Policy for public read access if needed
    // Uncomment if you want all users to see all profiles
    /*
    const publicReadPolicy = `
      CREATE POLICY "Public profiles are viewable by everyone"
      ON public.user_profiles
      FOR SELECT
      USING (true);
    `;
    await client.query(publicReadPolicy);
    console.log('✓ Created PUBLIC READ policy: Public profiles viewable by everyone');
    */

    console.log('\n=================================');
    console.log('RLS Policies Fixed Successfully!');
    console.log('=================================\n');

    // Verify the new policies
    const verifyQuery = `
      SELECT
        pol.polname as policy_name,
        CASE pol.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          ELSE 'ALL'
        END as operation,
        pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
        pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'user_profiles'
      AND n.nspname = 'public'
      ORDER BY pol.polname;
    `;

    const newPolicies = await client.query(verifyQuery);

    console.log('New RLS Policies:');
    console.log('==================\n');

    for (const policy of newPolicies.rows) {
      console.log(`Policy: ${policy.policy_name}`);
      console.log(`Operation: ${policy.operation}`);
      console.log(`USING: ${policy.using_expression || 'none'}`);
      console.log(`WITH CHECK: ${policy.with_check_expression || 'none'}`);
      console.log('---\n');
    }

    // Make sure RLS is enabled
    const enableRLSQuery = `
      ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    `;

    await client.query(enableRLSQuery);
    console.log('✓ RLS is enabled on user_profiles table\n');

    console.log('Summary:');
    console.log('========');
    console.log('1. Removed all existing policies that were causing recursion');
    console.log('2. Created simple, direct policies using auth.uid()');
    console.log('3. Added service role bypass for triggers');
    console.log('4. Ensured RLS is enabled on the table');
    console.log('\nThe infinite recursion issue should now be resolved!');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Details:', error);
  } finally {
    await client.end();
  }
}

fixRLSPolicies();