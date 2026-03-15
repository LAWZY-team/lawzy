import type { JSONContent } from '@tiptap/core'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

interface ExportMetadata {
  title?: string
}

export async function convertTipTapToDocx(content: JSONContent, metadata?: ExportMetadata) {
  const children: Paragraph[] = []

  // Convert TipTap JSON to docx
  if (content?.content) {
    for (const node of content.content) {
      const paragraphs = convertNode(node)
      children.push(...paragraphs)
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
          },
        },
      },
    },
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
  attrs?: Record<string, unknown> & { level?: number; fieldKey?: string; textAlign?: string }
  content?: TipTapNode[]
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
  text?: string
}

function convertNode(node: TipTapNode): Paragraph[] {
  const result: Paragraph[] = []

  let alignment: any
  if (node.attrs?.textAlign) {
    switch (node.attrs.textAlign) {
      case 'left': alignment = AlignmentType.LEFT; break;
      case 'center': alignment = AlignmentType.CENTER; break;
      case 'right': alignment = AlignmentType.RIGHT; break;
      case 'justify': alignment = AlignmentType.JUSTIFIED; break;
    }
  }

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
          alignment,
          spacing: { before: 240, after: 120 },
        })
      )
      break

    case 'paragraph':
      result.push(
        new Paragraph({
          children: convertInlineContent(node.content || []),
          alignment,
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
                  alignment,
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
                  alignment,
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
            alignment,
          })
        )
      }
  }

  return result
}

function convertInlineContent(content: TipTapNode[]): TextRun[] {
  const runs: TextRun[] = []

  for (const node of content) {
    if (node.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }))
      continue
    }

    if (node.type === 'text') {
      const isBold = node.marks?.some((m) => m.type === 'bold')
      const isItalic = node.marks?.some((m) => m.type === 'italic')
      const isUnderline = node.marks?.some((m) => m.type === 'underline')
      
      const textStyleMark = node.marks?.find((m) => m.type === 'textStyle')
      const fontFamily = textStyleMark?.attrs?.fontFamily as string | undefined
      const fontSizeStr = textStyleMark?.attrs?.fontSize as string | undefined
      
      let size: number | undefined
      if (fontSizeStr) {
        const num = parseFloat(fontSizeStr)
        if (!isNaN(num)) {
          // If the unit is 'pt', Word half-points = pt * 2
          // If the unit is 'px', Word half-points = px * 0.75 * 2 = px * 1.5
          if (fontSizeStr.includes('pt')) {
            size = Math.round(num * 2)
          } else if (fontSizeStr.includes('px')) {
            size = Math.round(num * 1.5)
          } else {
            // Default to points if no unit found (common for Word-style input)
            size = Math.round(num * 2)
          }
        }
      }

      runs.push(
        new TextRun({
          text: node.text || '',
          bold: isBold,
          italics: isItalic,
          underline: isUnderline ? {} : undefined,
          font: fontFamily || "Times New Roman",
          size: size,
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
          font: "Times New Roman",
        })
      )
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text: '' })]
}

