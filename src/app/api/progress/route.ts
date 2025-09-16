import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/progress - Fetch user's progress
export async function GET() {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch progress for this user
  const { data, error } = await supabase
    .from('user_progress')
    .select('chapter_id, completed_at')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ progress: data || [] })
}

// POST /api/progress - Mark a chapter as complete
export async function POST(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get chapter ID from request body
  const { chapterId } = await request.json()

  if (!chapterId) {
    return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })
  }

  // Insert progress record
  const { data, error } = await supabase
    .from('user_progress')
    .insert({
      user_id: user.id,
      chapter_id: chapterId
    })
    .select()

  if (error) {
    // Handle duplicate key error (already completed)
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Already completed' }, { status: 200 })
    }
    console.error('Error marking complete:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

// DELETE /api/progress - Remove completion (for testing)
export async function DELETE(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get chapter ID from request body
  const { chapterId } = await request.json()

  if (!chapterId) {
    return NextResponse.json({ error: 'Chapter ID required' }, { status: 400 })
  }

  // Delete progress record
  const { error } = await supabase
    .from('user_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)

  if (error) {
    console.error('Error removing completion:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}