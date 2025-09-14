export default function AICoachPage() {
  return (
    <div className="py-12 md:py-20 px-5 md:px-10">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{backgroundColor: 'var(--accent-yellow)'}}>
            <svg className="w-10 h-10" style={{color: 'var(--text-primary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="section-header mb-4" style={{color: 'var(--text-primary)'}}>AI Management Coach</h1>
          <p className="text-xl max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
            Get personalized management advice and coaching powered by AI. Ask questions about leadership challenges, team dynamics, and more.
          </p>
        </div>

        <div className="p-8 rounded-xl mb-8 border-2 border-yellow-200" style={{backgroundColor: 'var(--accent-yellow)', backgroundImage: 'linear-gradient(135deg, var(--accent-yellow) 0%, #fff3cd 100%)'}}>
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 mr-2" style={{color: 'var(--text-primary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Coming Soon</h2>
          </div>
          <p style={{color: 'var(--text-primary)'}}>
            Our AI Coach feature is currently in development. Soon you'll be able to have conversations with an AI that understands management principles and can provide personalized guidance based on the LevelUp training content.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="hover-lift p-8 rounded-2xl border border-gray-100 shadow-sm" style={{backgroundColor: 'var(--white)'}}>
            <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-bold mb-2 text-lg" style={{color: 'var(--text-primary)'}}>Personalized Advice</h3>
            <p style={{color: 'var(--text-secondary)'}}>Get tailored management guidance based on your specific situations and challenges.</p>
          </div>

          <div className="hover-lift p-8 rounded-2xl border border-gray-100 shadow-sm" style={{backgroundColor: 'var(--white)'}}>
            <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-bold mb-2 text-lg" style={{color: 'var(--text-primary)'}}>Content-Aware</h3>
            <p style={{color: 'var(--text-secondary)'}}>AI trained on LevelUp content to provide advice consistent with proven management principles.</p>
          </div>

          <div className="hover-lift p-8 rounded-2xl border border-gray-100 shadow-sm" style={{backgroundColor: 'var(--white)'}}>
            <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-bold mb-2 text-lg" style={{color: 'var(--text-primary)'}}>Instant Support</h3>
            <p style={{color: 'var(--text-secondary)'}}>Get immediate answers to management questions, available 24/7 whenever you need guidance.</p>
          </div>
        </div>

        <div className="text-center">
          <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
            While we're building the AI Coach, explore our comprehensive management training chapters.
          </p>
          <a
            href="/learn"
            className="hover-lift px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg"
            style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
          >
            Start Learning
          </a>
        </div>
      </div>
    </div>
  )
}