import AuthDebug from '@/components/AuthDebug'

export default function DebugAuthPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Authentication Debug Dashboard
        </h1>
        <AuthDebug />

        <div className="mt-8 text-center">
          <a
            href="/debug-progress.html"
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Progress Debug Tool →
          </a>
        </div>
      </div>
    </div>
  )
}