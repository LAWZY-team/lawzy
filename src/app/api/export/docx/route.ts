import type { JSONContent } from '@tiptap/core'
import { NextRequest, NextResponse } from 'next/server'
import { convertTipTapToDocx } from '@/lib/export/docx-converter'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { content?: JSONContent; metadata?: { title?: string } }
    const content = body.content ?? { type: 'doc', content: [] }
    const metadata = body.metadata

    const blob = await convertTipTapToDocx(content, metadata)
    const buffer = Buffer.from(await blob.arrayBuffer())

    const filename = metadata?.title
      ? `${metadata.title}.docx`
      : 'contract.docx'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error: unknown) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export document' },
      { status: 500 }
    )
  }
}
