import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Clean the text for better TTS output
    const cleanedText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // Limit text length to avoid huge API costs (OpenAI limit is 4096 chars)
    const truncatedText = cleanedText.substring(0, 4096)

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // or 'tts-1-hd' for higher quality
      voice: voice as any, // alloy, echo, fable, onyx, nova, shimmer
      input: truncatedText,
      speed: speed, // 0.25 to 4.0
    })

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Return the audio file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('TTS Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}

// Get available voices
export async function GET() {
  const voices = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral and fast' },
    { id: 'echo', name: 'Echo', description: 'British accent' },
    { id: 'fable', name: 'Fable', description: 'British accent, expressive' },
    { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
    { id: 'nova', name: 'Nova', description: 'Soft and pleasant' },
    { id: 'shimmer', name: 'Shimmer', description: 'Warm and welcoming' },
  ]

  return NextResponse.json({ voices })
}