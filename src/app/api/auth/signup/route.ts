import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { withRateLimit } from '@/lib/rate-limiter'
import { signupSchema, validateRequestBody } from '@/lib/validation'
import { apiError } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Validate request body
    const { data, error } = await validateRequestBody(request, signupSchema)
    if (error) {
      return apiError(error, 400, request)
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
        return apiError('Email already registered', 400, request)
      }
      return apiError('Invalid signup information', 400, request)
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

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName,
        lastName
      },
      requiresEmailVerification: true,
      message: 'Signup successful. Please check your email to verify your account.'
    })
  } catch (error) {
    console.error('Signup error:', error)
    return apiError('An error occurred', 500, request, error)
  }
}, 'auth')