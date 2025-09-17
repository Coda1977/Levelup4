// Simple API utilities - no over-engineering
import { NextResponse } from 'next/server'

export function apiError(message = 'Something went wrong', status = 500) {
  console.error(`API Error: ${message}`)
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess(data: any, status = 200) {
  return NextResponse.json(data, { status })
}