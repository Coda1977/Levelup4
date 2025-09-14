'use client'

import { useState, useRef } from 'react'

interface ChapterAudioPlayerProps {
  audioUrl: string
  title: string
  readingTime?: number
}

export default function ChapterAudioPlayer({ audioUrl, title, readingTime }: ChapterAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlay = () => {
    if (audioRef.current) {
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

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
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
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" 
               style={{backgroundColor: 'var(--accent-yellow)'}}>
            🎧
          </div>
          <div>
            <h3 className="font-semibold text-lg">Listen to this chapter</h3>
            <p className="text-sm text-gray-600">
              {readingTime ? `~${readingTime} minute listen` : 'Audio narration available'}
            </p>
          </div>
        </div>
        
        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Speed:</label>
          <select
            value={playbackRate}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
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
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
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
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--accent-blue) ${progress}%, #e5e7eb ${progress}%)`
            }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 hover:scale-105"
            style={{backgroundColor: 'var(--accent-blue)', color: 'white'}}
          >
            ▶️ Play Audio
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={handlePlay}
                className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
                style={{backgroundColor: 'var(--accent-blue)', color: 'white'}}
              >
                ▶️ Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
                style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}
              >
                ⏸ Pause
              </button>
            )}
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-full font-semibold transition-all duration-300"
              style={{backgroundColor: '#ff4444', color: 'white'}}
            >
              ⏹ Stop
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        input[type="range"].slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--accent-blue);
          border-radius: 50%;
          cursor: pointer;
        }
        
        input[type="range"].slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--accent-blue);
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}