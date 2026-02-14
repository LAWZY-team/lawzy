import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().match(/\.(pdf|doc|docx)$/)) {
      return NextResponse.json(
        { error: 'Only PDF, DOC and DOCX are allowed' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name
    const lower = fileName.toLowerCase()
    const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf')
    const isWord = lower.endsWith('.doc') || lower.endsWith('.docx') ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    let text: string
    if (isPdf) {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      await parser.destroy()
      text = result?.text ?? ''
    } else if (isWord) {
      try {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
      } catch (wordError) {
        const isLegacyDoc = lower.endsWith('.doc') && !lower.endsWith('.docx')
        if (isLegacyDoc) {
          return NextResponse.json(
            {
              error:
                'File Word 97-2003 (.doc) không đọc được. Vui lòng mở file trong Word và "Lưu dưới dạng" định dạng .docx rồi thử lại.',
            },
            { status: 400 }
          )
        }
        throw wordError
      }
    } else {
      text = ''
    }

    return NextResponse.json({ text: text || '', fileName })
  } catch (error) {
    console.error('Extract text error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract text' },
      { status: 500 }
    )
  }
}
