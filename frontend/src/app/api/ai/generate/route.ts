import { NextRequest, NextResponse } from 'next/server'
import { GeminiClient } from '@/lib/ai/gemini-client'
import { buildSourcesContext } from '@/lib/sources/build-context'

export async function POST(req: NextRequest) {
  try {
    const { metadata, prompt, existingContent, mergeFieldValues, attachedSources } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const sourcesContext = buildSourcesContext([])

    const gemini = new GeminiClient(apiKey)
    const normalizedAttached =
      Array.isArray(attachedSources) &&
      attachedSources.every(
        (s: unknown) => s && typeof s === 'object' && 'fileName' in s && 'text' in s
      )
        ? attachedSources.map((s: { fileName: string; text: string }) => ({
            fileName: String(s.fileName),
            text: String(s.text ?? ''),
          }))
        : undefined

    const result = await gemini.generateContract(metadata, prompt, sourcesContext, {
      existingContent: typeof existingContent === 'string' ? existingContent : undefined,
      mergeFieldValues:
        mergeFieldValues && typeof mergeFieldValues === 'object' && !Array.isArray(mergeFieldValues)
          ? Object.fromEntries(
              Object.entries(mergeFieldValues).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')])
            )
          : undefined,
      attachedSources: normalizedAttached?.length ? normalizedAttached : undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Generate contract error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate contract' },
      { status: 500 }
    )
  }
}
