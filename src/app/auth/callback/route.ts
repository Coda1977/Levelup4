import { createRouteHandlerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/learn'

  if (code) {
    const response = new NextResponse()
    const supabase = await createRouteHandlerClient(request, response)

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      console.log('User authenticated via callback:', data.user.email)

      // Initialize user profile if it doesn't exist (trigger handles auth.users sync)
      try {
        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!existingProfile) {
          // Create user profile with is_admin field (trigger handles auth.users sync)
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              first_name: data.user.user_metadata?.first_name || '',
              last_name: data.user.user_metadata?.last_name || '',
              is_admin: false,
            })

          if (profileError) {
            console.error('Error creating user profile:', profileError)
          } else {
            console.log('User profile created for:', data.user.email)
          }
        }
      } catch (initError) {
        console.error('Error initializing user:', initError)
        // Don't block the redirect if user initialization fails
      }

      // Redirect to the requested page or learn page
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error or login page with an error message
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}