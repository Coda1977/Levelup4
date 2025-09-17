import { ChatErrorBoundary } from '@/components/ErrorBoundary'
import ChatClientWithDB from './ChatClientWithDB'

export default function ChatPage() {
  return (
    <ChatErrorBoundary>
      <ChatClientWithDB />
    </ChatErrorBoundary>
  )
}