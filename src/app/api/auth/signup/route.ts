import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { withRateLimit } from '@/lib/rate-limiter'
import { signupSchema, validateRequestBody } from '@/lib/validation'
import { apiSuccess, authError, serverError, validationError } from '@/lib/api-response'

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Validate request body
    const { data, error } = await validateRequestBody(request, signupSchema)
    if (error) {
      return validationError(error)
    }

    const { email, password, firstName, lastName } = data!
    const supabase = await createClient()

    // Attempt signup
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    })

    if (signupError || !authData.user) {
      // Check for specific errors
      if (signupError?.message?.includes('already registered')) {
        return validationError('Email already registered')
      }
      return authError()
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        is_admin: false
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail signup if profile creation fails
    }

    return apiSuccess({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName,
        lastName
      },
      requiresEmailVerification: true
    }, 'Signup successful. Please check your email to verify your account.')
  } catch (error) {
    return serverError(error as Error)
  }
}, 'auth')