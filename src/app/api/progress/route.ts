import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { withRateLimit } from '@/lib/rate-limiter'
import { markCompleteSchema, validateRequestBody } from '@/lib/validation'
import { apiError, apiSuccess } from '@/lib/api-utils'

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return apiError('Unauthorized', 403)
    }

    // Get user progress
    const { data: progress, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error

    return apiSuccess({ progress: progress || [] })
  } catch (error) {
    console.error('Progress API error:', error)
    return apiError('Failed to fetch progress', 500, request, error)
  }
}, 'api')

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return apiError('Unauthorized', 403)
    }

    // Validate request body
    const { data: validatedData, error: validationErr } = await validateRequestBody(request, markCompleteSchema)
    if (validationErr) {
      return apiError(validationErr, 400)
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

    return apiSuccess({ message: 'Chapter marked as complete' })
  } catch (error) {
    console.error('Progress POST error:', error)
    return apiError('Failed to update progress', 500, request, error)
  }
}, 'api')

export const DELETE = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return apiError('Unauthorized', 403)
    }

    // Clear all progress
    const { error } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error

    return apiSuccess({ message: 'Progress cleared' })
  } catch (error) {
    console.error('Progress DELETE error:', error)
    return apiError('Failed to clear progress', 500, request, error)
  }
}, 'api')