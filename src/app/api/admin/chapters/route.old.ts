import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { withRateLimit } from '@/lib/rate-limiter'
import { createChapterSchema, updateChapterSchema, reorderChaptersSchema, validateRequestBody } from '@/lib/validation'
import { apiSuccess, serverError, validationError } from '@/lib/api-response'

export async function GET() {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin

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

    return NextResponse.json({
      categories: categories || [],
      chapters: chapters || []
    })
  } catch (error) {
    console.error('Error loading data:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin
    const formData = await request.json()

    const { data, error } = await admin
      .from('chapters')
      .insert(formData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, chapter: data })
  } catch (error) {
    console.error('Error creating chapter:', error)
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })
    }

    const formData = await request.json()

    const { data, error } = await admin
      .from('chapters')
      .update(formData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, chapter: data })
  } catch (error) {
    console.error('Error updating chapter:', error)
    return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin
    const { chapters } = await request.json()

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering chapters:', error)
    return NextResponse.json({ error: 'Failed to reorder chapters' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })
    }

    const { error } = await admin
      .from('chapters')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chapter:', error)
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 })
  }
}