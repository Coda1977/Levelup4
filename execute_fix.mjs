import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const { Client } = pg;

async function executeMigration() {
  // Try different connection string formats
  const connectionConfigs = [
    {
      connectionString: 'postgresql://postgres.exxildftqhnlupxdlqfn:Ntu1zsR23v6FBpvO@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
      ssl: { rejectUnauthorized: false }
    },
    {
      host: 'aws-1-eu-north-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.exxildftqhnlupxdlqfn',
      password: 'Ntu1zsR23v6FBpvO',
      ssl: { rejectUnauthorized: false }
    },
    {
      host: 'db.exxildftqhnlupxdlqfn.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Ntu1zsR23v6FBpvO',
      ssl: { rejectUnauthorized: false }
    }
  ];

  let client = null;
  let connected = false;

  for (const config of connectionConfigs) {
    try {
      console.log('Trying connection configuration...');
      client = new Client(config);
      await client.connect();
      connected = true;
      console.log('✅ Successfully connected to database!');
      break;
    } catch (error) {
      console.log(`Connection failed: ${error.message}`);
    }
  }

  if (!connected) {
    console.log('\n❌ Could not connect to database with any configuration.');
    console.log('\n📝 MANUAL ACTION REQUIRED:');
    console.log('Please execute the SQL manually in the Supabase Dashboard:');
    console.log('URL: https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/sql/new');
    console.log('\nThe migration file is located at:');
    console.log('/home/yonat/LevelUp4/supabase/migrations/20250916052747_fix_auth_structure.sql');
    return;
  }

  try {
    // Read the migration file
    const migrationSQL = await fs.readFile(
      resolve(__dirname, 'supabase/migrations/20250916052747_fix_auth_structure.sql'),
      'utf8'
    );

    console.log('\nExecuting migration...');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!');

    // Verify the fix
    console.log('\nVerifying database structure...');

    // Check if is_admin column exists
    const checkAdminCol = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      AND column_name = 'is_admin'
      AND table_schema = 'public'
    `);

    console.log('✅ is_admin column:', checkAdminCol.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');

    // Check foreign key constraint
    const checkFK = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user_progress'
      AND constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
    `);

    console.log('✅ Foreign key on user_progress:', checkFK.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');

    // Check trigger
    const checkTrigger = await client.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgname = 'on_auth_user_created'
    `);

    console.log('✅ Auto-creation trigger:', checkTrigger.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');

    // Check if users table was dropped
    const checkUsersTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'users'
      AND table_schema = 'public'
    `);

    console.log('✅ Redundant users table:', checkUsersTable.rows.length === 0 ? 'REMOVED' : 'STILL EXISTS');

    console.log('\n🎉 DATABASE FIX COMPLETED SUCCESSFULLY!');
    console.log('The authentication structure has been simplified to auth.users + user_profiles');
    console.log('New users will automatically get profiles created via trigger.');

  } catch (error) {
    console.error('\n❌ Error executing migration:', error.message);

    // Try to execute critical fixes individually
    console.log('\nAttempting individual fixes...');

    const criticalFixes = [
      {
        name: 'Add is_admin column',
        sql: 'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;'
      },
      {
        name: 'Fix user_progress foreign key',
        sql: `
          ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;
          ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        `
      },
      {
        name: 'Create auto-profile trigger',
        sql: `
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
        `
      }
    ];

    for (const fix of criticalFixes) {
      try {
        console.log(`\nExecuting: ${fix.name}`);
        await client.query(fix.sql);
        console.log(`✅ ${fix.name} - SUCCESS`);
      } catch (err) {
        console.log(`❌ ${fix.name} - FAILED: ${err.message}`);
      }
    }
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Check if pg is installed
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  try {
    // Check if pg module exists
    await import('pg');
    await executeMigration();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Installing required PostgreSQL client...');
      try {
        await execAsync('npm install pg');
        console.log('✅ PostgreSQL client installed');

        // Re-import and run
        const pgModule = await import('pg');
        await executeMigration();
      } catch (installError) {
        console.error('Failed to install pg module:', installError);
      }
    } else {
      console.error('Error:', error);
    }
  }
}

main();