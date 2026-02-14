import type { JSONContent } from '@tiptap/core'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

interface ExportMetadata {
  title?: string
}

export async function convertTipTapToDocx(content: JSONContent, metadata?: ExportMetadata) {
  const children: Paragraph[] = []

  // Add title
  if (metadata?.title) {
    children.push(
      new Paragraph({
        text: metadata.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400,
        },
      })
    )
  }

  // Convert TipTap JSON to docx
  if (content?.content) {
    for (const node of content.content) {
      const paragraphs = convertNode(node)
      children.push(...paragraphs)
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return await Packer.toBlob(doc)
}

interface TipTapNode {
  type?: string
  attrs?: Record<string, unknown> & { level?: number; fieldKey?: string }
  content?: TipTapNode[]
  marks?: Array<{ type?: string }>
  text?: string
}

function convertNode(node: TipTapNode): Paragraph[] {
  const result: Paragraph[] = []

  switch (node.type) {
    case 'heading':
      const level = node.attrs?.level || 1
      const headingLevel =
        level === 1 ? HeadingLevel.HEADING_1 :
        level === 2 ? HeadingLevel.HEADING_2 :
        HeadingLevel.HEADING_3

      result.push(
        new Paragraph({
          children: convertInlineContent(node.content || []),
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
        })
      )
      break

    case 'paragraph':
      result.push(
        new Paragraph({
          children: convertInlineContent(node.content || []),
          spacing: { after: 120 },
        })
      )
      break

    case 'bulletList':
      if (node.content) {
        for (const item of node.content) {
          if (item.type === 'listItem' && item.content) {
            for (const para of item.content) {
              result.push(
                new Paragraph({
                  children: convertInlineContent(para.content || []),
                  bullet: { level: 0 },
                })
              )
            }
          }
        }
      }
      break

    case 'orderedList':
      if (node.content) {
        for (const item of node.content) {
          if (item.type === 'listItem' && item.content) {
            for (const para of item.content) {
              result.push(
                new Paragraph({
                  children: convertInlineContent(para.content || []),
                  numbering: { reference: 'default', level: 0 },
                })
              )
            }
          }
        }
      }
      break

    case 'clause':
      if (node.content) {
        for (const child of node.content) {
          result.push(...convertNode(child as TipTapNode))
        }
      }
      break

    default:
      // Fallback for unknown node types
      if (node.content) {
        result.push(
          new Paragraph({
            children: convertInlineContent(node.content),
          })
        )
      }
  }

  return result
}

function convertInlineContent(content: TipTapNode[]): TextRun[] {
  const runs: TextRun[] = []

  for (const node of content) {
    if (node.type === 'text') {
      const isBold = node.marks?.some((m) => m.type === 'bold')
      const isItalic = node.marks?.some((m) => m.type === 'italic')
      const isUnderline = node.marks?.some((m) => m.type === 'underline')

      runs.push(
        new TextRun({
          text: node.text || '',
          bold: isBold,
          italics: isItalic,
          underline: isUnderline ? {} : undefined,
        })
      )
    } else if (node.type === 'mergeField' || node.type === 'field') {
      const fieldKey = (node.attrs?.fieldKey as string) ?? ''
      const placeholder = fieldKey ? `{{${fieldKey}}}` : ''
      runs.push(
        new TextRun({
          text: placeholder,
          bold: true,
          color: '0066CC',
        })
      )
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text: '' })]
}
