import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { withRateLimit } from '@/lib/rate-limiter'
import { loginSchema, validateRequestBody } from '@/lib/validation'
import { apiSuccess, authError, serverError, validationError } from '@/lib/api-response'

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Validate request body
    const { data, error } = await validateRequestBody(request, loginSchema)
    if (error) {
      return validationError(error)
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
      return authError()
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, is_admin')
      .eq('id', authData.user.id)
      .single()

    return apiSuccess({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        isAdmin: profile?.is_admin || false
      }
    }, 'Login successful')
  } catch (error) {
    return serverError(error as Error)
  }
}, 'auth')