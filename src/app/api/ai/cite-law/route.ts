import { NextRequest, NextResponse } from 'next/server'
import { GeminiClient } from '@/lib/ai/gemini-client'

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const gemini = new GeminiClient(apiKey)
    const result = await gemini.citeLaw(query)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Cite law error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cite law' },
      { status: 500 }
    )
  }
}
