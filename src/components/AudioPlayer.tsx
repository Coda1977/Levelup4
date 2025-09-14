'use client'

import { useState, useEffect, useRef } from 'react'

interface AudioPlayerProps {
  content: string
  title: string
  readingTime?: number
}

export default function AudioPlayer({ content, title, readingTime }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      // Prefer English voices
      const englishVoices = availableVoices.filter(voice => 
        voice.lang.startsWith('en')
      )
      setVoices(englishVoices.length > 0 ? englishVoices : availableVoices)
      
      // Set default voice (prefer a natural-sounding one)
      if (englishVoices.length > 0 && !selectedVoice) {
        const preferred = englishVoices.find(v => 
          v.name.includes('Natural') || 
          v.name.includes('Enhanced') ||
          v.name.includes('Premium')
        ) || englishVoices[0]
        setSelectedVoice(preferred)
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [selectedVoice])

  // Clean content for TTS (remove HTML tags)
  const getCleanText = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    let text = div.textContent || div.innerText || ''
    
    // Clean up extra whitespace
    text = text.replace(/\s+/g, ' ').trim()
    
    // Add pauses for better speech flow
    text = text.replace(/\. /g, '. ')  // Add slight pause after sentences
    text = text.replace(/([.!?])\s*([A-Z])/g, '$1 $2')  // Ensure spacing
    
    return text
  }

  const startSpeech = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const text = getCleanText(content)
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Configure utterance
      utterance.rate = speechRate
      utterance.pitch = 1.0
      utterance.volume = 1.0
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
      
      // Estimate duration (rough calculation)
      const wordsPerMinute = 150 * speechRate
      const wordCount = text.split(' ').length
      const estimatedDuration = (wordCount / wordsPerMinute) * 60
      setDuration(estimatedDuration)
      
      // Set up event handlers
      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
        
        // Update progress
        intervalRef.current = setInterval(() => {
          if (!window.speechSynthesis.paused && window.speechSynthesis.speaking) {
            setCurrentTime(prev => {
              const newTime = prev + 0.1
              setProgress((newTime / estimatedDuration) * 100)
              return newTime
            })
          }
        }, 100)
      }
      
      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
        setProgress(0)
        setCurrentTime(0)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        setIsPlaying(false)
        setIsPaused(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
      
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    } else {
      alert('Text-to-speech is not supported in your browser')
    }
  }

  const pauseSpeech = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  const resumeSpeech = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }

  const stopSpeech = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
    setCurrentTime(0)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--accent-yellow)'}}>
            🎧
          </div>
          <div>
            <h3 className="font-semibold text-lg">Listen to this chapter</h3>
            <p className="text-sm text-gray-600">
              {readingTime ? `~${readingTime} minute listen` : 'Audio version available'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isPlaying && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--accent-blue)'
              }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {!isPlaying ? (
          <button
            onClick={startSpeech}
            className="px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
            style={{backgroundColor: 'var(--accent-blue)', color: 'white'}}
          >
            ▶️ Play Audio
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeSpeech}
                className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
                style={{backgroundColor: 'var(--accent-blue)', color: 'white'}}
              >
                ▶️ Resume
              </button>
            ) : (
              <button
                onClick={pauseSpeech}
                className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
                style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}
              >
                ⏸ Pause
              </button>
            )}
            <button
              onClick={stopSpeech}
              className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
              style={{backgroundColor: '#ff4444', color: 'white'}}
            >
              ⏹ Stop
            </button>
          </>
        )}

        {/* Speed Control */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-gray-600">Speed:</label>
          <select
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            disabled={isPlaying}
            className="px-3 py-1 rounded border border-gray-300 text-sm"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="1.75">1.75x</option>
            <option value="2">2x</option>
          </select>
        </div>

        {/* Voice Selection (if multiple voices available) */}
        {voices.length > 1 && !isPlaying && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Voice:</label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value)
                setSelectedVoice(voice || null)
              }}
              className="px-3 py-1 rounded border border-gray-300 text-sm max-w-xs"
            >
              {voices.map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name.replace(/Microsoft|Google|Apple|/g, '').trim()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Fallback message for unsupported browsers */}
      {!('speechSynthesis' in window) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ Your browser doesn't support text-to-speech. Try using Chrome, Safari, or Edge for audio playback.
        </div>
      )}
    </div>
  )
}