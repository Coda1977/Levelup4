'use client'

import { useState, useRef, useEffect } from 'react'

interface OpenAIAudioPlayerProps {
  content: string
  title: string
  readingTime?: number
}

type Voice = {
  id: string
  name: string
  description: string
}

export default function OpenAIAudioPlayer({ content, title, readingTime }: OpenAIAudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [speed, setSpeed] = useState(1.0)
  const [voices, setVoices] = useState<Voice[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  // Load available voices
  useEffect(() => {
    fetch('/api/tts')
      .then(res => res.json())
      .then(data => setVoices(data.voices))
      .catch(err => console.error('Failed to load voices:', err))
  }, [])

  // Clean content for TTS
  const getCleanText = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    let text = div.textContent || div.innerText || ''
    
    // Clean up for better speech
    text = text.replace(/\s+/g, ' ').trim()
    
    // Limit to first 4000 chars (OpenAI limit is 4096)
    if (text.length > 4000) {
      text = text.substring(0, 4000) + '...'
    }
    
    return text
  }

  const generateAudio = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const cleanText = getCleanText(content)
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: selectedVoice,
          speed: speed,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate audio')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      
      // Create and play audio
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.playbackRate = 1.0 // Speed is already applied in generation
        audioRef.current.play()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio')
      setIsLoading(false)
    }
  }

  const handlePlay = () => {
    if (!audioUrl) {
      generateAudio()
    } else if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
      setIsPaused(false)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPaused(true)
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(0)
      setCurrentTime(0)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [audioUrl])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" 
               style={{backgroundColor: 'var(--accent-yellow)'}}>
            🎧
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Audio Narration</h3>
            <p className="text-sm text-gray-600">
              {readingTime ? `~${readingTime} minute listen` : 'High-quality AI voice'}
            </p>
          </div>
        </div>
        
        {/* Voice Selection */}
        <div className="flex items-center gap-4">
          <select
            value={selectedVoice}
            onChange={(e) => {
              setSelectedVoice(e.target.value)
              // Reset audio if already generated
              if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
                setAudioUrl(null)
                handleStop()
              }
            }}
            disabled={isPlaying || isLoading}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            {voices.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name} - {voice.description}
              </option>
            ))}
          </select>
          
          <select
            value={speed}
            onChange={(e) => {
              setSpeed(parseFloat(e.target.value))
              // Reset audio if already generated
              if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
                setAudioUrl(null)
                handleStop()
              }
            }}
            disabled={isPlaying || isLoading}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
          </select>
        </div>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => {
          const audio = e.target as HTMLAudioElement
          setDuration(audio.duration)
        }}
        onTimeUpdate={(e) => {
          const audio = e.target as HTMLAudioElement
          setCurrentTime(audio.currentTime)
          setProgress((audio.currentTime / audio.duration) * 100)
        }}
        onPlay={() => {
          setIsPlaying(true)
          setIsPaused(false)
          setIsLoading(false)
        }}
        onPause={() => {
          setIsPaused(true)
        }}
        onEnded={() => {
          setIsPlaying(false)
          setIsPaused(false)
          setProgress(0)
          setCurrentTime(0)
        }}
      />

      {/* Progress Bar */}
      {(isPlaying || isPaused) && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent-blue) ${progress}%, #e5e7eb ${progress}%)`
            }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {isLoading ? (
          <button
            disabled
            className="px-6 py-3 rounded-full font-semibold bg-gray-300 text-gray-500 flex items-center gap-2"
          >
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Generating audio...
          </button>
        ) : !isPlaying ? (
          <button
            onClick={handlePlay}
            className="px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 hover:scale-105"
            style={{backgroundColor: 'var(--accent-blue)', color: 'white'}}
          >
            ▶️ {audioUrl ? 'Resume' : 'Play Audio'}
          </button>
        ) : (
          <>
            <button
              onClick={handlePause}
              className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
              style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}
            >
              ⏸ Pause
            </button>
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
              style={{backgroundColor: '#ff4444', color: 'white'}}
            >
              ⏹ Stop
            </button>
          </>
        )}

        {/* Cost estimate */}
        <div className="ml-auto text-xs text-gray-500">
          💡 Estimated cost: ~${((getCleanText(content).length / 1000) * 0.015).toFixed(3)}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Info message */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        💡 This uses OpenAI's text-to-speech technology for high-quality audio narration. 
        The audio is generated on-demand and cached for this session.
      </div>
    </div>
  )
}