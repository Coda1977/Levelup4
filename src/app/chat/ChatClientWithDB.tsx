'use client'

import { useState, useEffect, useRef } from 'react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import DOMPurify from 'dompurify'
import {
  getUserSession,
  saveConversation as saveToLocalStorage,
  deleteConversation as deleteFromLocalStorage,
  generateId,
  generateConversationTitle
} from '@/lib/chat-storage'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  is_archived?: boolean
  is_starred?: boolean
  selected_chapters?: any[]
  message_count?: number
}

interface Message {
  id?: string
  conversation_id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  followups?: string[]
  relevant_chapters?: any[]
}

// Example questions for empty state (show 3)
const EXAMPLE_QUESTIONS = [
  "How do I delegate without micromanaging?",
  "My team member isn't meeting expectations",
  "How do I give critical feedback?"
]

// Popular topics based on chapters
const POPULAR_TOPICS = [
  { label: "Delegation", icon: "🎯", query: "How do I delegate effectively?" },
  { label: "Feedback", icon: "💬", query: "How do I give feedback?" },
  { label: "Accountability", icon: "✅", query: "How do I hold people accountable?" },
  { label: "Meetings", icon: "📅", query: "How do I run better meetings?" },
  { label: "Motivation", icon: "🚀", query: "How do I motivate my team?" },
  { label: "Coaching", icon: "🎓", query: "How do I coach my direct reports?" }
]

export default function ChatClientWithDB() {
  const { chapters, fetchChaptersAndCategories } = useData()
  const { user } = useAuth()

  // State for conversations and messages
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [hasMigrated, setHasMigrated] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load conversations from database if authenticated
  useEffect(() => {
    if (user) {
      loadConversations()
      migrateLocalStorageIfNeeded()
    } else {
      // Fall back to localStorage for unauthenticated users
      const session = getUserSession()
      const localConversations = session.conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        created_at: conv.createdAt.toString(),
        updated_at: conv.updatedAt.toString(),
        message_count: conv.messages.length
      }))
      setConversations(localConversations)
    }
  }, [user])

  // Load conversations from database
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    if (!user) {
      // Load from localStorage for unauthenticated users
      const session = getUserSession()
      const localConv = session.conversations.find(c => c.id === conversationId)
      if (localConv) {
        setMessages(localConv.messages)
      }
      return
    }

    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Migrate localStorage to database (one-time)
  const migrateLocalStorageIfNeeded = async () => {
    if (hasMigrated) return

    const migrationKey = `chat_migrated_${user?.id}`
    if (localStorage.getItem(migrationKey)) {
      setHasMigrated(true)
      return
    }

    const session = getUserSession()
    if (session.conversations.length > 0) {
      try {
        const response = await fetch('/api/chat/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversations: session.conversations })
        })

        if (response.ok) {
          localStorage.setItem(migrationKey, 'true')
          setHasMigrated(true)
          // Clear localStorage after successful migration
          localStorage.removeItem('levelup_chat_session')
          loadConversations()
        }
      } catch (error) {
        console.error('Migration failed:', error)
      }
    }
  }

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setShowSidebar(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch chapters once on mount
  useEffect(() => {
    fetchChaptersAndCategories()
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  // Create new conversation
  const createNewConversation = async () => {
    const title = 'New Conversation'

    if (!user) {
      // Create locally for unauthenticated users
      const newConv: Conversation = {
        id: generateId(),
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0
      }
      setConversations([newConv, ...conversations])
      setActiveConversation(newConv)
      setMessages([])
      return
    }

    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })

      if (response.ok) {
        const data = await response.json()
        setConversations([data.conversation, ...conversations])
        setActiveConversation(data.conversation)
        setMessages([])
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  // Select conversation
  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv)
    loadMessages(conv.id)
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  // Delete conversation
  const handleDeleteConversation = async (convId: string) => {
    if (!user) {
      // Delete locally for unauthenticated users
      deleteFromLocalStorage(convId)
      const session = getUserSession()
      const localConversations = session.conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        created_at: conv.createdAt.toString(),
        updated_at: conv.updatedAt.toString(),
        message_count: conv.messages.length
      }))
      setConversations(localConversations)
      if (activeConversation?.id === convId) {
        setActiveConversation(null)
        setMessages([])
      }
      return
    }

    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId })
      })

      if (response.ok) {
        setConversations(conversations.filter(c => c.id !== convId))
        if (activeConversation?.id === convId) {
          setActiveConversation(null)
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  // Send message
  const sendMessage = async (content?: string) => {
    const messageText = content || inputMessage.trim()
    if (!messageText || isLoading) return

    // Create new conversation if needed
    if (!activeConversation) {
      await createNewConversation()
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setStreamingMessage('')

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: activeConversation?.id,
          chapters: chapters,
          completedChapters: [],
          previousMessages: messages
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let followups: string[] = []
      let conversationId = activeConversation?.id

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              // Save the complete assistant message
              const assistantMessage: Message = {
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
                followups
              }
              setMessages(prev => [...prev, assistantMessage])
              setStreamingMessage('')

              // Update conversation title if it's the first message
              if (messages.length === 0 && activeConversation) {
                const newTitle = generateConversationTitle(messageText)
                if (user) {
                  // Update in database
                  await fetch('/api/chat/conversations', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: activeConversation.id,
                      title: newTitle
                    })
                  })
                }
                setActiveConversation(prev => prev ? { ...prev, title: newTitle } : null)
                setConversations(prev =>
                  prev.map(c => c.id === activeConversation.id
                    ? { ...c, title: newTitle }
                    : c
                  )
                )
              }
            } else {
              try {
                const json = JSON.parse(data)

                if (json.text) {
                  fullResponse += json.text
                  setStreamingMessage(fullResponse)
                }

                if (json.followups) {
                  followups = json.followups
                }

                if (json.conversationId && !conversationId) {
                  conversationId = json.conversationId
                  // Update active conversation with new ID
                  setActiveConversation(prev => prev ? { ...prev, id: conversationId } : null)
                }
              } catch (e) {
                // Not JSON, skip
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
    }
  }

  // Handle input keypress
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${
        showSidebar ? 'w-64' : 'w-0'
      } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>

        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewConversation}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                activeConversation?.id === conv.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conv.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {conv.message_count || 0} messages
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteConversation(conv.id)
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {user && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Logged in as: {user.email}
            </p>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ☰
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {activeConversation?.title || 'AI Coach'}
          </h2>
          <div className="w-10" />
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 && !streamingMessage && (
            <div className="max-w-2xl mx-auto py-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">
                How can I help you today?
              </h3>

              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-3">Try asking:</p>
                <div className="space-y-2">
                  {EXAMPLE_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="block w-full text-left px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-3">Popular topics:</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TOPICS.map((topic, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(topic.query)}
                      className="px-3 py-1.5 bg-white rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                    >
                      {topic.icon} {topic.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-2xl px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(msg.content.replace(/\n/g, '<br>'))
                  }}
                />
                {msg.followups && msg.followups.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Follow-up questions:</p>
                    {msg.followups.map((followup, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => sendMessage(followup)}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 py-1"
                      >
                        → {followup}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-2xl px-4 py-3 rounded-lg bg-white border border-gray-200">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(streamingMessage.replace(/\n/g, '<br>'))
                  }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about management and leadership..."
                rows={1}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}