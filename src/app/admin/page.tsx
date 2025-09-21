'use client'

import dynamic from 'next/dynamic'

// Dynamically import the client component to avoid SSR issues with drag-and-drop
const AdminPanelClient = dynamic(() => import('./AdminPanelClient'), {
  loading: () => (
    <div className="py-12 md:py-20 px-5 md:px-10" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="max-w-6xl mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-b-transparent mx-auto mb-4" style={{borderColor: 'var(--accent-yellow)', borderBottomColor: 'transparent'}}></div>
        <p style={{color: 'var(--text-secondary)'}}>Loading admin panel...</p>
      </div>
    </div>
  )
})

export default function AdminPanel() {
  return <AdminPanelClient />
}