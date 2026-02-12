import { NextRequest, NextResponse } from 'next/server'
import { GeminiClient } from '@/lib/ai/gemini-client'

export async function POST(req: NextRequest) {
  try {
    const { content, metadata } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const gemini = new GeminiClient(apiKey)
    const result = await gemini.reviewContract(content, metadata)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Review contract error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to review contract' },
      { status: 500 }
    )
  }
}
