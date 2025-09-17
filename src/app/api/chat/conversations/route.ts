import { createClient } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'

// GET /api/chat/conversations - Fetch user's conversations
export async function GET() {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch conversations for this user
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      is_archived,
      is_starred,
      selected_chapters,
      messages!inner(
        id
      )
    `)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform data to include message count
  const conversations = data?.map(conv => ({
    id: conv.id,
    title: conv.title,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    is_starred: conv.is_starred,
    is_archived: conv.is_archived,
    selected_chapters: conv.selected_chapters,
    message_count: conv.messages?.length || 0
  })) || []

  return NextResponse.json({ conversations })
}

// POST /api/chat/conversations - Create a new conversation
export async function POST(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get conversation data from request body
  const { title, selected_chapters = [] } = await request.json()

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title,
      selected_chapters
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversation: data })
}

// PUT /api/chat/conversations - Update a conversation
export async function PUT(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get update data from request body
  const { id, title, is_archived, is_starred } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
  }

  // Build update object dynamically
  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (is_archived !== undefined) updateData.is_archived = is_archived
  if (is_starred !== undefined) updateData.is_starred = is_starred

  // Update conversation
  const { data, error } = await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversation: data })
}

// DELETE /api/chat/conversations - Delete a conversation
export async function DELETE(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get conversation ID from request body
  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
  }

  // Delete conversation (messages will cascade delete)
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}