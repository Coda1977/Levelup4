import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get categories (publicly available)
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    if (categoriesError) throw categoriesError

    // Get chapters with category info (publicly available)
    const { data: chapters, error: chaptersError } = await supabase
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