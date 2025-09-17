import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long')
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase()
})

// Chapter schemas
export const createChapterSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  preview: z.string().max(500, 'Preview too long').optional(),
  sort_order: z.number().int().min(0).optional(),
  content_type: z.enum(['lesson', 'book_summary']).optional(),
  chapter_number: z.number().int().min(1).optional(),
  reading_time: z.number().int().min(1).nullable().optional(),
  podcast_title: z.string().max(200).nullable().optional(),
  podcast_url: z.string().url().nullable().optional(),
  video_title: z.string().max(200).nullable().optional(),
  video_url: z.string().url().nullable().optional(),
  try_this_week: z.string().nullable().optional(),
  author: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  key_takeaways: z.array(z.string()).nullable().optional(),
  podcast_header: z.string().nullable().optional(),
  video_header: z.string().nullable().optional()
})

export const updateChapterSchema = createChapterSchema.partial().extend({
  id: z.string().uuid('Invalid chapter ID')
})

export const reorderChaptersSchema = z.object({
  chapters: z.array(z.object({
    id: z.string().uuid('Invalid chapter ID'),
    sort_order: z.number().int().min(0).optional()
  }))
})

// Progress schemas
export const markCompleteSchema = z.object({
  chapterId: z.string().uuid('Invalid chapter ID')
})

// Chat schemas
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  chapterContext: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string()
  })).optional()
})

export const createConversationSchema = z.object({
  initialMessage: z.string().min(1).max(4000)
})

// Generic ID validation
export const uuidSchema = z.string().uuid('Invalid ID format')

// Validation error formatter
export function formatZodErrors(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
}

// Helper to validate and parse request body
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: formatZodErrors(error) }
    }
    return { error: 'Invalid request body' }
  }
}