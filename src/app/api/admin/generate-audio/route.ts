import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin // TypeScript helper - we know it's not null after check above
    const { chapterId, text, voice = 'nova', regenerate = false } = await request.json()

    if (!chapterId || !text) {
      return NextResponse.json(
        { error: 'Chapter ID and text are required' },
        { status: 400 }
      )
    }

    // Check if audio already exists (unless regenerating)
    if (!regenerate) {
      const { data: chapter } = await admin
        .from('chapters')
        .select('audio_url')
        .eq('id', chapterId)
        .single()
      
      if (chapter?.audio_url) {
        return NextResponse.json({ 
          audioUrl: chapter.audio_url,
          message: 'Audio already exists' 
        })
      }
    }

    // Clean the text for TTS
    const cleanedText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 4096) // OpenAI limit

    // Generate audio with OpenAI
    console.log(`Generating audio for chapter ${chapterId} with voice ${voice}...`)
    
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // Use tts-1-hd for higher quality if needed
      voice: voice as any,
      input: cleanedText,
      speed: 1.0,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    
    // Create storage bucket if it doesn't exist
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'chapter-audio')) {
      await admin.storage.createBucket('chapter-audio', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      })
    }

    // Upload to Supabase Storage
    const fileName = `${chapterId}-${Date.now()}.mp3`
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('chapter-audio')
      .upload(fileName, buffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('chapter-audio')
      .getPublicUrl(fileName)

    // Update chapter with audio URL
    const { error: updateError } = await admin
      .from('chapters')
      .update({ 
        audio_url: publicUrl,
        audio_voice: voice,
        audio_generated_at: new Date().toISOString()
      })
      .eq('id', chapterId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    // Calculate cost
    const cost = (cleanedText.length / 1000) * 0.015

    return NextResponse.json({ 
      audioUrl: publicUrl,
      message: 'Audio generated successfully',
      cost: cost.toFixed(4),
      charactersProcessed: cleanedText.length
    })
  } catch (error) {
    console.error('Generate audio error:', error)
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    )
  }
}

// Delete audio for a chapter
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth()
    if (!authResult.isAuthorized) {
      return authResult.response!
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 500 }
      )
    }

    const admin = supabaseAdmin
    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')

    if (!chapterId) {
      return NextResponse.json(
        { error: 'Chapter ID is required' },
        { status: 400 }
      )
    }

    // Get current audio URL
    const { data: chapter } = await admin
      .from('chapters')
      .select('audio_url')
      .eq('id', chapterId)
      .single()

    if (chapter?.audio_url) {
      // Extract file name from URL
      const urlParts = chapter.audio_url.split('/')
      const fileName = urlParts[urlParts.length - 1]

      // Delete from storage
      await admin.storage
        .from('chapter-audio')
        .remove([fileName])
    }

    // Clear audio URL in database
    await admin
      .from('chapters')
      .update({ 
        audio_url: null,
        audio_voice: null,
        audio_generated_at: null
      })
      .eq('id', chapterId)

    return NextResponse.json({ message: 'Audio deleted successfully' })
  } catch (error) {
    console.error('Delete audio error:', error)
    return NextResponse.json(
      { error: 'Failed to delete audio' },
      { status: 500 }
    )
  }
}