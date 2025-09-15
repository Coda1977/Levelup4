'use client'

import { useState, useEffect, useRef } from 'react'
import { useData } from '@/contexts/DataContext'
import { Conversation, Message } from '@/types/chat'
import DOMPurify from 'dompurify'
import {
  getUserSession,
  saveConversation,
  deleteConversation,
  generateId,
  generateConversationTitle
} from '@/lib/chat-storage'

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

export default function ChatClient() {
  const { chapters, fetchChaptersAndCategories } = useData()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load conversations and check for mobile
  useEffect(() => {
    const session = getUserSession()
    setConversations(session.conversations)

    // Check if mobile
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
  }, []) // Intentionally empty to run once

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages, streamingMessage])

  // Save scroll position when switching conversations
  const saveScrollPosition = () => {
    if (activeConversation && messagesContainerRef.current) {
      setScrollPositions(prev => ({
        ...prev,
        [activeConversation.id]: messagesContainerRef.current!.scrollTop
      }))
    }
  }

  // Restore scroll position when switching back
  useEffect(() => {
    if (activeConversation && messagesContainerRef.current && scrollPositions[activeConversation.id]) {
      messagesContainerRef.current.scrollTop = scrollPositions[activeConversation.id]
    }
  }, [activeConversation?.id])

  // Create new conversation
  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setActiveConversation(newConversation)
    if (isMobile) setShowSidebar(false)
    inputRef.current?.focus()
  }

  // Send message with streaming
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim()
    if (!textToSend || isLoading) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    }

    // Create or update conversation
    let conversation = activeConversation
    if (!conversation) {
      conversation = {
        id: generateId(),
        title: generateConversationTitle(textToSend),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }

    // Add user message
    conversation.messages.push(userMessage)
    conversation.updatedAt = new Date()

    // Update title if it's the first message
    if (conversation.messages.length === 1) {
      conversation.title = generateConversationTitle(textToSend)
    }

    setActiveConversation({ ...conversation })
    setInputMessage('')
    setIsLoading(true)
    setStreamingMessage('')

    try {
      // Get user session for completed chapters
      const session = getUserSession()

      // Call the streaming API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversation.id,
          chapters: chapters,
          completedChapters: session.completedChapters,
          previousMessages: conversation.messages.slice(-10)
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(errorText || 'Failed to get response')
      }

      // Read the stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body to stream')
      }

      const decoder = new TextDecoder()
      let accumulatedText = ''
      let followups: string[] = []

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              break
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                accumulatedText += parsed.text
                setStreamingMessage(accumulatedText)
              }
              if (parsed.followups) {
                followups = parsed.followups
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Remove follow-up markers from the response
      const followupRegex = /\[FOLLOWUP_1\]\s*(.*?)\s*\[FOLLOWUP_2\]\s*(.*?)$/s
      const cleanResponse = accumulatedText.replace(followupRegex, '').trim()

      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: cleanResponse,
        timestamp: new Date(),
        followups: followups
      }

      conversation.messages.push(assistantMessage)
      conversation.updatedAt = new Date()

      // Save conversation
      saveConversation(conversation)
      setActiveConversation({ ...conversation })
      setStreamingMessage('')

      // Update conversations list
      setConversations(prev => {
        const existing = prev.find(c => c.id === conversation.id)
        if (existing) {
          return prev.map(c => c.id === conversation.id ? conversation : c)
        } else {
          return [conversation, ...prev]
        }
      })

    } catch (error) {
      console.error('Failed to send message:', error)

      // Try fallback to non-streaming API
      try {
        const fallbackSession = getUserSession()
        const fallbackResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            conversationId: conversation.id,
            chapters: chapters,
            completedChapters: fallbackSession.completedChapters,
            previousMessages: conversation.messages.slice(-10)
          })
        })

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()

          // Add assistant message
          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            followups: data.followups
          }

          conversation.messages.push(assistantMessage)
          conversation.updatedAt = new Date()

          // Save conversation
          saveConversation(conversation)
          setActiveConversation({ ...conversation })
          setStreamingMessage('')

          // Update conversations list
          setConversations(prev => {
            const existing = prev.find(c => c.id === conversation.id)
            if (existing) {
              return prev.map(c => c.id === conversation.id ? conversation : c)
            } else {
              return [conversation, ...prev]
            }
          })

          return // Success with fallback
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }

      // Add error message if both attempts failed
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Sorry, I couldn't process your message. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date()
      }
      conversation.messages.push(errorMessage)
      setActiveConversation({ ...conversation })
      setStreamingMessage('')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle follow-up click - auto-send
  const handleFollowupClick = (followup: string) => {
    sendMessage(followup)
  }

  // Handle example question click
  const handleExampleClick = (question: string) => {
    if (!activeConversation) {
      createNewConversation()
    }
    setTimeout(() => sendMessage(question), 100)
  }

  // Delete conversation
  const handleDeleteConversation = (convId: string) => {
    saveScrollPosition()
    deleteConversation(convId)
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeConversation?.id === convId) {
      setActiveConversation(null)
    }
  }

  // Switch conversation
  const switchConversation = (conv: Conversation) => {
    saveScrollPosition()
    setActiveConversation(conv)
    if (isMobile) setShowSidebar(false)
  }

  // Copy message
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // Format message content (convert markdown bold to HTML)
  const formatMessageContent = (content: string) => {
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
    return DOMPurify.sanitize(formatted)
  }

  // Get user initials
  const getUserInitial = () => {
    const session = getUserSession()
    return session.userId.substring(0, 2).toUpperCase()
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative md:translate-x-0 z-30 w-64 h-full border-r transition-transform duration-300`}
        style={{ backgroundColor: 'var(--white)', borderColor: 'var(--border-color, #e5e5e5)' }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color, #e5e5e5)' }}>
          <button
            onClick={createNewConversation}
            className="w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-md"
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: 'var(--white)'
            }}
          >
            + New Chat
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-80px)]">
          {conversations.length === 0 ? (
            <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  activeConversation?.id === conv.id ? 'bg-blue-50' : ''
                }`}
                style={{ borderColor: 'var(--border-color, #e5e5e5)' }}
                onClick={() => switchConversation(conv)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {conv.title}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteConversation(conv.id)
                    }}
                    className="ml-2 p-1 rounded hover:bg-red-100 transition-colors"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        {isMobile && (
          <div className="flex items-center p-4 border-b" style={{ backgroundColor: 'var(--white)', borderColor: 'var(--border-color, #e5e5e5)' }}>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="ml-4 font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              AI Coach
            </h1>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef}>
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
              <div className="mb-8">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'var(--accent-yellow)' }}>
                  <svg className="w-10 h-10" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Welcome to AI Coach
                </h2>
                <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
                  I'm here to help you become a better manager. Ask me about leadership challenges, team dynamics, or any management situation you're facing.
                </p>

                {/* Example Questions */}
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Try asking
                  </p>
                  <div className="grid gap-2 max-w-md mx-auto">
                    {EXAMPLE_QUESTIONS.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(question)}
                        className="text-left px-4 py-2 rounded-lg border transition-all duration-200 hover:shadow-md"
                        style={{
                          backgroundColor: 'var(--white)',
                          borderColor: 'var(--border-color, #e5e5e5)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <span className="text-sm">{question}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={createNewConversation}
                  className="px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--accent-blue)',
                    color: 'var(--white)'
                  }}
                >
                  Start a Conversation
                </button>
              </div>
            </div>
          ) : activeConversation ? (
            <div className="max-w-3xl mx-auto">
              {activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI Avatar */}
                  {message.role === 'assistant' && (
                    <div className="mr-3 flex-shrink-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)' }}
                      >
                        AI
                      </div>
                    </div>
                  )}

                  <div className={`max-w-[80%]`}>
                    <div
                      className={`inline-block ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                          : 'rounded-2xl rounded-tl-sm shadow-md'
                      } px-4 py-3`}
                      style={{
                        backgroundColor: message.role === 'user' ? undefined : '#f8f9fa'
                      }}
                    >
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                        style={{ color: message.role === 'user' ? 'white' : 'var(--text-primary)' }}
                      />
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => copyMessage(message.content)}
                          className="mt-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
                          title="Copy message"
                        >
                          Copy
                        </button>
                      )}
                    </div>

                    {/* Follow-up suggestions - improved design */}
                    {message.followups && message.followups.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Suggested follow-ups:
                        </div>
                        <div className="space-y-2">
                          {message.followups.map((followup, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFollowupClick(followup)}
                              className="flex items-start gap-2 text-left w-full px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-md group"
                              style={{
                                backgroundColor: 'var(--white)',
                                borderColor: 'var(--border-color, #e5e5e5)',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <span className="text-blue-600 group-hover:scale-110 transition-transform">→</span>
                              <span className="text-sm flex-1">{followup}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {message.role === 'user' && (
                    <div className="ml-3 flex-shrink-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--white)' }}
                      >
                        {getUserInitial()}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming message */}
              {streamingMessage && (
                <div className="mb-6 flex justify-start">
                  <div className="mr-3 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)' }}
                    >
                      AI
                    </div>
                  </div>
                  <div className="max-w-[80%]">
                    <div
                      className="inline-block rounded-2xl rounded-tl-sm shadow-md px-4 py-3"
                      style={{ backgroundColor: '#f8f9fa' }}
                    >
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formatMessageContent(streamingMessage) }}
                        style={{ color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && !streamingMessage && (
                <div className="mb-6 flex justify-start">
                  <div className="mr-3 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)' }}
                    >
                      AI
                    </div>
                  </div>
                  <div className="inline-block rounded-2xl rounded-tl-sm shadow-md px-4 py-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          ) : null}
        </div>

        {/* Input Area */}
        {activeConversation && (
          <div className="border-t p-4" style={{ backgroundColor: 'var(--white)', borderColor: 'var(--border-color, #e5e5e5)' }}>
            <div className="max-w-3xl mx-auto flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Ask me about management, leadership, or team challenges..."
                className="flex-1 px-4 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--border-color, #e5e5e5)',
                  minHeight: '50px',
                  maxHeight: '150px'
                }}
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'var(--white)'
                }}
              >
                Send
              </button>
            </div>
            <div className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        )}
      </div>
    </div>
  )
}