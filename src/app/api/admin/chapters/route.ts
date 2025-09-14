import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Get categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('sort_order')

    if (categoriesError) throw categoriesError

    // Get chapters with category info
    const { data: chapters, error: chaptersError } = await supabaseAdmin
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
    const formData = await request.json()
    
    const { error } = await supabaseAdmin
      .from('chapters')
      .insert(formData)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating chapter:', error)
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...formData } = await request.json()
    
    const { error } = await supabaseAdmin
      .from('chapters')
      .update(formData)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating chapter:', error)
    return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
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