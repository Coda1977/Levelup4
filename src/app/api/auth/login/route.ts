import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { withRateLimit } from '@/lib/rate-limiter'
import { loginSchema, validateRequestBody } from '@/lib/validation'
import { apiError, apiSuccess } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Validate request body
    const { data, error } = await validateRequestBody(request, loginSchema)
    if (error) {
      return apiError(error, 400)
    }

    const { email, password } = data!
    const supabase = await createClient()

    // Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      // Generic error message for security
      return apiError('Invalid credentials', 401)
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, is_admin')
      .eq('id', authData.user.id)
      .single()

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        isAdmin: profile?.is_admin || false
      },
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    return apiError('An error occurred', 500)
  }
}, 'auth')