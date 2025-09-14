'use client'

import { useState } from 'react'

interface AudioGenerationControlsProps {
  chapterId: string
  content: string
  existingAudioUrl?: string | null
  onAudioGenerated?: (audioUrl: string) => void
}

export default function AudioGenerationControls({ 
  chapterId, 
  content, 
  existingAudioUrl,
  onAudioGenerated 
}: AudioGenerationControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || null)
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [error, setError] = useState<string | null>(null)
  const [generationInfo, setGenerationInfo] = useState<{
    cost?: string
    charactersProcessed?: number
  } | null>(null)

  const voices = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral and fast' },
    { id: 'echo', name: 'Echo', description: 'British accent' },
    { id: 'fable', name: 'Fable', description: 'British, expressive' },
    { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
    { id: 'nova', name: 'Nova', description: 'Soft and pleasant (recommended)' },
    { id: 'shimmer', name: 'Shimmer', description: 'Warm and welcoming' },
  ]

  const generateAudio = async (regenerate = false) => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterId,
          text: content,
          voice: selectedVoice,
          regenerate
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate audio')
      }

      const data = await response.json()
      setAudioUrl(data.audioUrl)
      setGenerationInfo({
        cost: data.cost,
        charactersProcessed: data.charactersProcessed
      })
      
      if (onAudioGenerated) {
        onAudioGenerated(data.audioUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio')
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteAudio = async () => {
    if (!confirm('Are you sure you want to delete the audio? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/generate-audio?chapterId=${chapterId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete audio')
      }

      setAudioUrl(null)
      setGenerationInfo(null)
      if (onAudioGenerated) {
        onAudioGenerated('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete audio')
    }
  }

  // Estimate cost before generation
  const estimatedCost = content ? ((content.replace(/<[^>]*>/g, '').length / 1000) * 0.015).toFixed(3) : '0.000'

  return (
    <div className="space-y-4">
      {/* Voice Selection */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
          Voice:
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          disabled={isGenerating}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
        >
          {voices.map(voice => (
            <option key={voice.id} value={voice.id}>
              {voice.name} - {voice.description}
            </option>
          ))}
        </select>
      </div>

      {/* Current Status */}
      {audioUrl ? (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-800">✅ Audio Generated</p>
              <audio controls className="mt-2">
                <source src={audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              {generationInfo && (
                <p className="text-xs text-green-600 mt-2">
                  Cost: ${generationInfo.cost} | Characters: {generationInfo.charactersProcessed}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => generateAudio(true)}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={deleteAudio}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-gray-600">No audio generated yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Estimated cost: ${estimatedCost} for {content ? content.replace(/<[^>]*>/g, '').length : 0} characters
          </p>
        </div>
      )}

      {/* Generate Button */}
      {!audioUrl && (
        <button
          onClick={() => generateAudio(false)}
          disabled={isGenerating || !content}
          className="px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              Generating Audio...
            </>
          ) : (
            <>
              🎙️ Generate Audio (${estimatedCost})
            </>
          )}
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500">
        💡 Audio is generated once and stored permanently. Users will instantly play the pre-generated audio without any API calls.
      </div>
    </div>
  )
}