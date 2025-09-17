'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ErrorLog {
  id: string
  created_at: string
  error_message: string
  error_stack?: string
  error_type?: string
  endpoint?: string
  method?: string
  status_code?: number
  user_email?: string
  ip_address?: string
  user_agent?: string
  metadata?: any
}

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchErrorLogs()
  }, [])

  const fetchErrorLogs = async () => {
    try {
      const response = await fetch('/api/admin/setup-error-logs')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error('Failed to fetch error logs')
      }

      const data = await response.json()

      if (data.error?.includes('does not exist')) {
        setError('Error logs table not set up yet. Please run the migration in Supabase dashboard.')
      } else {
        setLogs(data.logs || [])
      }
    } catch (err) {
      setError('Failed to load error logs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getErrorTypeColor = (type?: string) => {
    switch (type) {
      case 'api': return 'bg-red-100 text-red-800'
      case 'auth': return 'bg-yellow-100 text-yellow-800'
      case 'database': return 'bg-purple-100 text-purple-800'
      case 'validation': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (code?: number) => {
    if (!code) return 'text-gray-600'
    if (code >= 500) return 'text-red-600 font-semibold'
    if (code >= 400) return 'text-yellow-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading error logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Error Monitoring</h1>
          <div className="flex gap-2">
            <button
              onClick={fetchErrorLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {logs.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No errors logged yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Server errors (500+) will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Endpoint
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getErrorTypeColor(log.error_type)}`}>
                        {log.error_type || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {log.error_message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.method && log.endpoint ? (
                        <span className="font-mono text-xs">
                          {log.method} {log.endpoint}
                        </span>
                      ) : '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${getStatusColor(log.status_code)}`}>
                      {log.status_code || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.user_email || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold">Error Details</h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-600">Message</h3>
                    <p className="mt-1 text-red-600">{selectedLog.error_message}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600">Time</h3>
                      <p className="mt-1">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600">Type</h3>
                      <p className="mt-1">{selectedLog.error_type || 'unknown'}</p>
                    </div>
                  </div>

                  {selectedLog.endpoint && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600">Endpoint</h3>
                      <p className="mt-1 font-mono text-sm">
                        {selectedLog.method} {selectedLog.endpoint}
                      </p>
                    </div>
                  )}

                  {selectedLog.error_stack && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600">Stack Trace</h3>
                      <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        {selectedLog.error_stack}
                      </pre>
                    </div>
                  )}

                  {selectedLog.metadata && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600">Metadata</h3>
                      <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.user_agent && (
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600">User Agent</h3>
                      <p className="mt-1 text-sm">{selectedLog.user_agent}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}