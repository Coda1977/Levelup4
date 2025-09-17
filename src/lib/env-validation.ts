/**
 * Environment variable validation
 * Validates required environment variables at startup
 */

type RequiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string // Optional for client-side
}

class EnvValidationError extends Error {
  constructor(missingVars: string[]) {
    super(`Missing required environment variables: ${missingVars.join(', ')}`)
    this.name = 'EnvValidationError'
  }
}

export function validateEnv(): RequiredEnvVars {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ] as const

  const missingVars: string[] = []

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  }

  if (missingVars.length > 0) {
    throw new EnvValidationError(missingVars)
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}

// Validate on import (fail fast)
if (typeof window === 'undefined') {
  // Only validate on server-side
  try {
    validateEnv()
  } catch (error) {
    console.error('⚠️  Environment validation failed:', error)
    if (process.env.NODE_ENV === 'production') {
      // In production, throw to prevent startup
      throw error
    } else {
      // In development, warn but continue
      console.warn('Continuing in development mode despite missing environment variables')
    }
  }
}