import { createClient } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return NextResponse.json({ session })
}