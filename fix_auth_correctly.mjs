import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const { Client } = pg;

async function fixDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres.exxildftqhnlupxdlqfn:Ntu1zsR23v6FBpvO@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Execute fixes one by one
    const fixes = [
      {
        name: '1. Add is_admin column to user_profiles',
        sql: `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;`
      },
      {
        name: '2. Migrate is_admin data from users to user_profiles',
        sql: `
          UPDATE public.user_profiles p
          SET is_admin = u.is_admin
          FROM public.users u
          WHERE p.id = u.id
            AND u.is_admin IS NOT NULL;
        `
      },
      {
        name: '3. Drop foreign key constraint from user_progress to users',
        sql: `ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;`
      },
      {
        name: '4. Add foreign key constraint from user_progress to auth.users',
        sql: `
          ALTER TABLE public.user_progress
          ADD CONSTRAINT user_progress_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        `
      },
      {
        name: '5. Ensure user_profiles references auth.users',
        sql: `
          ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
          ALTER TABLE public.user_profiles
          ADD CONSTRAINT user_profiles_id_fkey
          FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        `
      },
      {
        name: '6. Create handle_new_user function',
        sql: `
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS trigger AS $$
          BEGIN
              INSERT INTO public.user_profiles (
                id,
                first_name,
                last_name,
                is_admin,
                created_at,
                updated_at
              )
              VALUES (
                new.id,
                '',
                '',
                false,
                now(),
                now()
              )
              ON CONFLICT (id) DO NOTHING;

              RETURN new;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        name: '7. Create trigger for auto profile creation',
        sql: `
          DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

          CREATE TRIGGER on_auth_user_created
              AFTER INSERT ON auth.users
              FOR EACH ROW
              EXECUTE FUNCTION public.handle_new_user();
        `
      },
      {
        name: '8. Create profiles for existing auth users without profiles',
        sql: `
          INSERT INTO public.user_profiles (id, first_name, last_name, is_admin, created_at, updated_at)
          SELECT
              au.id,
              '',
              '',
              false,
              COALESCE(au.created_at, now()),
              now()
          FROM auth.users au
          LEFT JOIN public.user_profiles up ON au.id = up.id
          WHERE up.id IS NULL
          ON CONFLICT (id) DO NOTHING;
        `
      },
      {
        name: '9. Drop the redundant public.users table',
        sql: `DROP TABLE IF EXISTS public.users CASCADE;`
      },
      {
        name: '10. Create RLS policy for user_profiles (view own)',
        sql: `
          ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
          CREATE POLICY "Users can view own profile" ON public.user_profiles
              FOR SELECT USING (auth.uid() = id);
        `
      },
      {
        name: '11. Create RLS policy for user_profiles (update own)',
        sql: `
          DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
          CREATE POLICY "Users can update own profile" ON public.user_profiles
              FOR UPDATE USING (auth.uid() = id);
        `
      },
      {
        name: '12. Create RLS policy for admins on user_profiles',
        sql: `
          DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
          CREATE POLICY "Admins can view all profiles" ON public.user_profiles
              FOR SELECT USING (
                  EXISTS (
                      SELECT 1 FROM public.user_profiles
                      WHERE id = auth.uid() AND is_admin = true
                  )
              );
        `
      },
      {
        name: '13. Create RLS policies for user_progress',
        sql: `
          ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_progress;
          CREATE POLICY "Users can manage own progress" ON public.user_progress
              FOR ALL USING (auth.uid() = user_id);

          DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_progress;
          CREATE POLICY "Admins can view all progress" ON public.user_progress
              FOR SELECT USING (
                  EXISTS (
                      SELECT 1 FROM public.user_profiles
                      WHERE id = auth.uid() AND is_admin = true
                  )
              );
        `
      }
    ];

    console.log('=== EXECUTING DATABASE FIXES ===\n');

    let successCount = 0;
    let failCount = 0;

    for (const fix of fixes) {
      try {
        console.log(`Executing: ${fix.name}`);
        await client.query(fix.sql);
        console.log(`  ✅ SUCCESS\n`);
        successCount++;
      } catch (error) {
        console.log(`  ❌ FAILED: ${error.message}\n`);
        failCount++;
      }
    }

    console.log('=== VERIFICATION ===\n');

    // Verify the results
    const verifications = [
      {
        name: 'user_profiles has is_admin column',
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'user_profiles'
            AND column_name = 'is_admin'
            AND table_schema = 'public'
        `
      },
      {
        name: 'user_progress references auth.users',
        sql: `
          SELECT ccu.table_name AS foreign_table_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.table_name = 'user_progress'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'user_id'
        `
      },
      {
        name: 'public.users table removed',
        sql: `
          SELECT COUNT(*)
          FROM information_schema.tables
          WHERE table_name = 'users'
            AND table_schema = 'public'
        `
      },
      {
        name: 'Trigger exists',
        sql: `
          SELECT COUNT(*)
          FROM pg_trigger
          WHERE tgname = 'on_auth_user_created'
        `
      }
    ];

    for (const check of verifications) {
      try {
        const result = await client.query(check.sql);
        if (check.name === 'public.users table removed') {
          const removed = result.rows[0].count === '0';
          console.log(`${check.name}: ${removed ? '✅ YES' : '❌ NO'}`);
        } else if (check.name === 'user_progress references auth.users') {
          const referencesAuth = result.rows[0]?.foreign_table_name === 'users';
          console.log(`${check.name}: ${referencesAuth ? '✅ YES' : '❌ NO'}`);
        } else {
          const exists = result.rows.length > 0 && result.rows[0].count > 0;
          console.log(`${check.name}: ${exists ? '✅ YES' : '❌ NO'}`);
        }
      } catch (error) {
        console.log(`${check.name}: ❌ CHECK FAILED`);
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`✅ Successful operations: ${successCount}/${fixes.length}`);
    console.log(`❌ Failed operations: ${failCount}/${fixes.length}`);

    if (successCount === fixes.length) {
      console.log('\n🎉 DATABASE SUCCESSFULLY FIXED!');
      console.log('The authentication structure has been simplified:');
      console.log('  - auth.users: Core authentication (managed by Supabase)');
      console.log('  - user_profiles: Extended user data with is_admin flag');
      console.log('  - Automatic profile creation via trigger');
      console.log('  - All foreign keys properly reference auth.users');
    } else if (successCount > 0) {
      console.log('\n⚠️  PARTIAL SUCCESS');
      console.log('Some operations completed, but manual intervention may be needed.');
    }

  } catch (error) {
    console.error('Connection error:', error.message);
  } finally {
    await client.end();
  }
}

fixDatabase().catch(console.error);