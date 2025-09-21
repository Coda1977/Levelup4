import { createClient } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'

// POST /api/chat/migrate - Migrate localStorage chat history to database
export async function POST(request: Request) {
  const supabase = await createClient()

  // Get the current user from server-side auth
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get localStorage data from request body
    const { conversations } = await request.json()

    if (!conversations || !Array.isArray(conversations)) {
      return NextResponse.json({ error: 'Invalid conversation data' }, { status: 400 })
    }

    let migratedCount = 0

    // Process each conversation
    for (const conv of conversations) {
      try {
        // Create conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title: conv.title || 'Untitled Conversation',
            created_at: conv.createdAt || new Date().toISOString(),
            updated_at: conv.updatedAt || new Date().toISOString(),
            selected_chapters: conv.selectedChapters || []
          })
          .select()
          .single()

        if (convError) {
          console.error('Error creating conversation:', convError)
          continue
        }

        // Create messages for this conversation
        if (conv.messages && Array.isArray(conv.messages)) {
          const messages = conv.messages.map((msg: any) => ({
            conversation_id: newConv.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            followups: msg.followups || [],
            relevant_chapters: msg.relevantChapters || []
          }))

          const { error: msgError } = await supabase
            .from('messages')
            .insert(messages)

          if (msgError) {
            console.error('Error creating messages:', msgError)
            // Delete the conversation if messages failed
            await supabase
              .from('conversations')
              .delete()
              .eq('id', newConv.id)
            continue
          }
        }

        migratedCount++
      } catch (convError) {
        console.error('Error migrating conversation:', convError)
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      totalCount: conversations.length
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}