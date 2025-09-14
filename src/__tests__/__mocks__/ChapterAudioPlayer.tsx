import React from 'react'

interface ChapterAudioPlayerProps {
  audioUrl: string
  title: string
  readingTime: number
}

export default function ChapterAudioPlayer({ audioUrl, title, readingTime }: ChapterAudioPlayerProps) {
  return (
    <div data-testid="audio-player">
      <div>Audio: {title}</div>
      <div>Duration: {readingTime} min</div>
      <div>URL: {audioUrl}</div>
    </div>
  )
}