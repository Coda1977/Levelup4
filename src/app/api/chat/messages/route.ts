import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/chat/messages?conversationId=xxx - Fetch messages for a conversation
export async function GET(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get conversation ID from query params
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
  }

  // First verify the conversation belongs to the user
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Fetch messages for this conversation
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages || [] })
}

// POST /api/chat/messages - Add a message to a conversation
export async function POST(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get message data from request body
  const {
    conversation_id,
    role,
    content,
    followups = [],
    relevant_chapters = [],
    is_complete = true,
    token_count
  } = await request.json()

  if (!conversation_id || !role || !content) {
    return NextResponse.json({
      error: 'conversation_id, role, and content are required'
    }, { status: 400 })
  }

  // Verify the conversation belongs to the user
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .eq('user_id', user.id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Create the message
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      role,
      content,
      followups,
      relevant_chapters,
      is_complete,
      token_count
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: data })
}

// DELETE /api/chat/messages - Delete a specific message
export async function DELETE(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get message ID from request body
  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
  }

  // Delete the message (only if it belongs to user's conversation)
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id)
    .in('conversation_id',
      supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
    )

  if (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}