'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function TestAuthPage() {
  const { user, profile } = useAuth()
  const [progress, setProgress] = useState<any[]>([])
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Test fetching progress
  const testFetchProgress = async () => {
    setLoading(true)
    setTestResult('Fetching progress...')

    try {
      const response = await fetch('/api/progress', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setProgress(data.progress)
        setTestResult(`✅ Success! Found ${data.progress.length} completed chapters`)
      } else {
        const error = await response.text()
        setTestResult(`❌ Failed: ${response.status} - ${error}`)
      }
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`)
    }

    setLoading(false)
  }

  // Test marking a chapter complete
  const testMarkComplete = async () => {
    setLoading(true)
    setTestResult('Testing mark complete...')

    // Get first chapter ID from API
    try {
      const chaptersResponse = await fetch('/api/admin/chapters')
      const chaptersData = await chaptersResponse.json()

      if (chaptersData.chapters && chaptersData.chapters.length > 0) {
        const testChapterId = chaptersData.chapters[0].id

        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ chapterId: testChapterId }),
        })

        if (response.ok) {
          setTestResult('✅ Successfully marked chapter as complete!')
          testFetchProgress() // Refresh progress
        } else {
          const error = await response.text()
          setTestResult(`❌ Failed to mark complete: ${error}`)
        }
      }
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`)
    }

    setLoading(false)
  }

  // Test session endpoint
  const testSession = async () => {
    setLoading(true)
    setTestResult('Testing session...')

    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.session) {
          setTestResult(`✅ Session found! User: ${data.session.user.email}`)
        } else {
          setTestResult('❌ No session found')
        }
      } else {
        setTestResult(`❌ Failed: ${response.status}`)
      }
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen p-8" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth System Test Page</h1>

        {/* Current Auth Status */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth Status</h2>
          <div className="space-y-2">
            <p><strong>User Email:</strong> {user?.email || 'Not logged in'}</p>
            <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
            <p><strong>Profile Name:</strong> {profile ? `${profile.firstName} ${profile.lastName}` : 'No profile'}</p>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Auth Functions</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={testSession}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Test Session API
            </button>
            <button
              onClick={testFetchProgress}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              Test Fetch Progress
            </button>
            <button
              onClick={testMarkComplete}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
            >
              Test Mark Complete
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className="p-4 bg-gray-100 rounded mt-4">
              <pre className="whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </div>

        {/* Progress Display */}
        {progress.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Your Progress ({progress.length} chapters)</h2>
            <div className="space-y-2">
              {progress.map((item, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <p className="text-sm">
                    Chapter ID: {item.chapter_id}
                    <br />
                    Completed: {new Date(item.completed_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}