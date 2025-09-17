import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { withRateLimit } from '@/lib/rate-limiter'
import { markCompleteSchema, validateRequestBody } from '@/lib/validation'
import { apiSuccess, serverError, validationError, forbiddenError } from '@/lib/api-response'

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return forbiddenError()
    }

    // Get user progress
    const { data: progress, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error

    return apiSuccess({ progress: progress || [] })
  } catch (error) {
    return serverError(error as Error)
  }
}, 'api')

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return forbiddenError()
    }

    // Validate request body
    const { data: validatedData, error: validationErr } = await validateRequestBody(request, markCompleteSchema)
    if (validationErr) {
      return validationError(validationErr)
    }

    const { chapterId } = validatedData!

    // Mark chapter as complete
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        chapter_id: chapterId,
        completed: true,
        completed_at: new Date().toISOString()
      })

    if (error) throw error

    return apiSuccess(null, 'Chapter marked as complete')
  } catch (error) {
    return serverError(error as Error)
  }
}, 'api')

export const DELETE = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return forbiddenError()
    }

    // Clear all progress
    const { error } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error

    return apiSuccess(null, 'Progress cleared')
  } catch (error) {
    return serverError(error as Error)
  }
}, 'api')