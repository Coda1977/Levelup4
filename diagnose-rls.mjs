#!/usr/bin/env node

import pg from 'pg';

const { Client } = pg;

// Database connection
const client = new Client({
  host: 'db.exxildftqhnlupxdlqfn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ntu1zsR23v6FBpvO',
  ssl: { rejectUnauthorized: false }
});

async function diagnoseRLS() {
  try {
    await client.connect();
    console.log('Connected to database successfully\n');

    // Get current RLS policies for user_profiles
    const policiesQuery = `
      SELECT
        pol.polname as policy_name,
        pol.polcmd as command,
        CASE pol.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          ELSE 'ALL'
        END as operation,
        pol.polroles::regrole[] as roles,
        pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
        pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'user_profiles'
      AND n.nspname = 'public'
      ORDER BY pol.polname;
    `;

    const policies = await client.query(policiesQuery);

    console.log('Current RLS Policies for user_profiles:');
    console.log('==========================================\n');

    for (const policy of policies.rows) {
      console.log(`Policy: ${policy.policy_name}`);
      console.log(`Operation: ${policy.operation}`);
      console.log(`Roles: ${policy.roles || 'all'}`);
      console.log(`USING: ${policy.using_expression || 'none'}`);
      console.log(`WITH CHECK: ${policy.with_check_expression || 'none'}`);
      console.log('---\n');
    }

    // Check if RLS is enabled
    const rlsStatusQuery = `
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = 'user_profiles'
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `;

    const rlsStatus = await client.query(rlsStatusQuery);
    console.log(`RLS Enabled: ${rlsStatus.rows[0]?.relrowsecurity || false}\n`);

    // Check table structure
    const tableQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const columns = await client.query(tableQuery);
    console.log('Table Structure:');
    console.log('================');
    for (const col of columns.rows) {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    }
    console.log('\n');

    // Check for any functions that might be causing recursion
    const functionsQuery = `
      SELECT
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) LIKE '%user_profiles%'
      AND p.proname NOT LIKE 'handle_%';
    `;

    const functions = await client.query(functionsQuery);
    if (functions.rows.length > 0) {
      console.log('Functions referencing user_profiles:');
      console.log('=====================================');
      for (const func of functions.rows) {
        console.log(`Function: ${func.function_name}`);
        console.log('---\n');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

diagnoseRLS();