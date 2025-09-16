import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const { Client } = pg;

async function checkStructure() {
  const client = new Client({
    connectionString: 'postgresql://postgres.exxildftqhnlupxdlqfn:Ntu1zsR23v6FBpvO@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.\n');

    // Check user_progress structure
    const progressCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_progress'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('user_progress table columns:');
    progressCols.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check existing constraints
    const constraints = await client.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'user_progress'
      AND tc.table_schema = 'public'
    `);

    console.log('\nConstraints on user_progress:');
    constraints.rows.forEach(con => {
      console.log(`  - ${con.constraint_name}: ${con.constraint_type}`);
      if (con.constraint_type === 'FOREIGN KEY') {
        console.log(`    References: ${con.foreign_table_name}.${con.foreign_column_name}`);
      }
    });

    // Check user_profiles structure
    const profileCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('\nuser_profiles table columns:');
    profileCols.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Check if users table exists and its structure
    const usersExists = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    if (usersExists.rows.length > 0) {
      console.log('\npublic.users table columns:');
      usersExists.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('\npublic.users table: NOT FOUND');
    }

  } finally {
    await client.end();
  }
}

checkStructure().catch(console.error);