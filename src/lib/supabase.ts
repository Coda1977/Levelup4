import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Regular client for frontend operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client that bypasses RLS policies
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          description: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          sort_order: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          sort_order?: number
          created_at?: string
        }
      }
      chapters: {
        Row: {
          id: string
          category_id: string
          title: string
          content: string
          preview: string
          sort_order: number
          created_at: string
          content_type: string
          chapter_number: number
          reading_time: number | null
          podcast_title: string | null
          podcast_url: string | null
          video_title: string | null
          video_url: string | null
          try_this_week: string | null
          author: string | null
          description: string | null
          key_takeaways: string[] | null
          podcast_header: string | null
          video_header: string | null
        }
        Insert: {
          id?: string
          category_id: string
          title: string
          content: string
          preview: string
          sort_order: number
          created_at?: string
          content_type?: string
          chapter_number?: number
          reading_time?: number | null
          podcast_title?: string | null
          podcast_url?: string | null
          video_title?: string | null
          video_url?: string | null
          try_this_week?: string | null
        }
        Update: {
          id?: string
          category_id?: string
          title?: string
          content?: string
          preview?: string
          sort_order?: number
          created_at?: string
          content_type?: string
          chapter_number?: number
          reading_time?: number | null
          podcast_title?: string | null
          podcast_url?: string | null
          video_title?: string | null
          video_url?: string | null
          try_this_week?: string | null
        }
      }
    }
  }
}