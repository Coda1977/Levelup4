import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-client'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { withRateLimit } from '@/lib/rate-limiter'
import { createChapterSchema, updateChapterSchema, reorderChaptersSchema, validateRequestBody } from '@/lib/validation'
import { apiError, apiSuccess } from '@/lib/api-utils'

export const GET = withRateLimit(async () => {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    const admin = createAdminClient()

    // Get categories
    const { data: categories, error: categoriesError } = await admin
      .from('categories')
      .select('*')
      .order('sort_order')

    if (categoriesError) throw categoriesError

    // Get chapters with category info
    const { data: chapters, error: chaptersError } = await admin
      .from('chapters')
      .select(`
        *,
        categories (
          id,
          name,
          description,
          sort_order
        )
      `)
      .order('sort_order')

    if (chaptersError) throw chaptersError

    return apiSuccess({
      categories: categories || [],
      chapters: chapters || []
    })
  } catch (error) {
    return apiError('Server error', 500)
  }
}, 'admin')

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    const admin = createAdminClient()

    // Validate request body
    const { data: formData, error: validationErr } = await validateRequestBody(request, createChapterSchema)
    if (validationErr) {
      return apiError(validationErr, 400)
    }

    const { data, error } = await admin
      .from('chapters')
      .insert(formData!)
      .select()
      .single()

    if (error) throw error

    return apiSuccess({ chapter: data, message: 'Chapter created successfully' })
  } catch (error) {
    return apiError('Server error', 500)
  }
}, 'admin')

export const PUT = withRateLimit(async (request: NextRequest) => {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    const admin = createAdminClient()

    // Validate request body
    const { data: validatedData, error: validationErr } = await validateRequestBody(request, updateChapterSchema)
    if (validationErr) {
      return apiError(validationErr, 400)
    }

    const { id, ...updates } = validatedData!

    const { error } = await admin
      .from('chapters')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    return apiSuccess({ message: 'Chapter updated successfully' })
  } catch (error) {
    return apiError('Server error', 500)
  }
}, 'admin')

export const PATCH = withRateLimit(async (request: NextRequest) => {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    const admin = createAdminClient()

    // Validate request body
    const { data: validatedData, error: validationErr } = await validateRequestBody(request, reorderChaptersSchema)
    if (validationErr) {
      return apiError(validationErr, 400)
    }

    const { chapters } = validatedData!

    // Update sort_order for all chapters
    const updates = chapters.map((chapter: any, index: number) =>
      admin
        .from('chapters')
        .update({ sort_order: index })
        .eq('id', chapter.id)
    )

    const results = await Promise.all(updates)

    // Check if any updates failed
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      throw new Error('Failed to update some chapters')
    }

    return apiSuccess({ message: 'Chapters reordered successfully' })
  } catch (error) {
    return apiError('Server error', 500)
  }
}, 'admin')

export const DELETE = withRateLimit(async (request: NextRequest) => {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return apiError('Chapter ID is required', 400)
    }

    const { error } = await admin
      .from('chapters')
      .delete()
      .eq('id', id)

    if (error) throw error

    return apiSuccess({ message: 'Chapter deleted successfully' })
  } catch (error) {
    return apiError('Server error', 500)
  }
}, 'admin')