import type { JSONContent } from '@tiptap/core'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  TableLayoutType,
} from 'docx'

interface ExportMetadata {
  title?: string
}

type DocChild = Paragraph | Table
type InlineDocChild = TextRun | ImageRun

interface ExportRuntimeContext {
  requestCookie?: string
  requestOrigin?: string
}
interface InlineRenderOptions {
  defaultFontSizeHalfPoint?: number
  forceBold?: boolean
}

export async function convertTipTapToDocx(
  content: JSONContent,
  metadata?: ExportMetadata,
  runtimeContext?: ExportRuntimeContext,
) {
  void metadata
  const children: DocChild[] = []

  if (content?.content) {
    for (const node of content.content) {
      const elements = await convertNode(node, runtimeContext)
      children.push(...elements)
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
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1134,
              bottom: 1440,
              left: 1134,
            },
          },
        },
        children,
      },
    ],
  })

  return await Packer.toBlob(doc)
}

interface TipTapNode {
  type?: string
  attrs?: Record<string, unknown> & {
    level?: number;
    fieldKey?: string;
    textAlign?: string;
    indent?: number;
  }
  content?: TipTapNode[]
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
  text?: string
}

async function convertNode(
  node: TipTapNode,
  runtimeContext?: ExportRuntimeContext,
): Promise<DocChild[]> {
  const result: DocChild[] = []

  let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] | undefined
  if (node.attrs?.textAlign) {
    switch (node.attrs.textAlign) {
      case 'left': alignment = AlignmentType.LEFT; break;
      case 'center': alignment = AlignmentType.CENTER; break;
      case 'right': alignment = AlignmentType.RIGHT; break;
      case 'justify': alignment = AlignmentType.JUSTIFIED; break;
    }
  }

  const indentValue = node.attrs?.indent ? (node.attrs.indent as number) * 360 : undefined
  const indent = indentValue ? { left: indentValue } : undefined

  switch (node.type) {
    case 'heading': {
      const level = node.attrs?.level || 1
      const headingSizeByLevel: Record<number, number> = {
        1: 32, // 16pt
        2: 28, // 14pt
        3: 26, // 13pt
      }
      const headingSize = headingSizeByLevel[level] ?? 26

      const headingAlignment =
        alignment ??
        (level === 1 ? AlignmentType.CENTER : undefined)

      result.push(
        new Paragraph({
          children: await convertInlineContent(node.content || [], runtimeContext, {
            defaultFontSizeHalfPoint: headingSize,
            forceBold: true,
          }),
          alignment: headingAlignment,
          indent,
          spacing: { before: level === 1 ? 260 : 180, after: 120, line: 360 },
        })
      )
      break
    }

    case 'paragraph':
      result.push(
        new Paragraph({
          children: await convertInlineContent(node.content || [], runtimeContext),
          alignment,
          indent,
          spacing: { after: 120, line: 360 },
        })
      )
      break

    case 'image': {
      const imageSrc = (node.attrs?.src as string | undefined)?.trim()
      const imageWidth =
        typeof node.attrs?.width === 'number'
          ? (node.attrs.width as number)
          : undefined
      const imageRun = imageSrc
        ? await convertImageNodeToRun(imageSrc, runtimeContext, imageWidth)
        : null
      if (imageRun) {
        result.push(
          new Paragraph({
            children: [imageRun],
            alignment: alignment || AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
          }),
        )
      } else {
        result.push(
          new Paragraph({
            children: [new TextRun({ text: '[Image unavailable]' })],
            alignment: alignment || AlignmentType.LEFT,
            spacing: { after: 120 },
          }),
        )
      }
      break
    }

    case 'horizontalRule':
      result.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' } },
          spacing: { before: 120, after: 120 },
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
                  children: await convertInlineContent(para.content || [], runtimeContext),
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
                  children: await convertInlineContent(para.content || [], runtimeContext),
                  alignment,
                  numbering: { reference: 'default', level: 0 },
                })
              )
            }
          }
        }
      }
      break

    case 'table':
      if (node.content) {
        const normalizedRows = node.content
          .filter((row) => row.type === 'tableRow')
          .map((row) =>
            (row.content || [])
              .filter((cell) => cell.type === 'tableCell' || cell.type === 'tableHeader')
          )
          .filter((cells) => cells.length > 0)

        if (isKeyValueTableLayout(normalizedRows)) {
          result.push(...convertKeyValueTableToParagraphs(normalizedRows))
          break
        }

        const maxColumns = Math.max(
          1,
          ...normalizedRows.map((cells) => cells.length),
        )
        const columnWidthPercent = Math.max(1, Math.floor(100 / maxColumns))
        const tableRows: TableRow[] = []
        for (const cells of normalizedRows) {
          const tableCells: TableCell[] = []
          for (const cell of cells) {
            const cellParagraphs: Paragraph[] = []
            for (const cellChild of cell.content || []) {
              if (cellChild.type === 'paragraph') {
                cellParagraphs.push(
                  new Paragraph({
                    children: await convertInlineContent(
                      cellChild.content || [],
                      runtimeContext,
                    ),
                    spacing: { after: 80, line: 320 },
                  }),
                )
                continue
              }
              const nestedBlocks = await convertNode(
                cellChild as TipTapNode,
                runtimeContext,
              )
              cellParagraphs.push(
                ...nestedBlocks.filter((c): c is Paragraph => c instanceof Paragraph),
              )
            }
            tableCells.push(
              new TableCell({
                children:
                  cellParagraphs.length > 0
                    ? cellParagraphs
                    : [new Paragraph({ children: [new TextRun({ text: '' })] })],
                width: {
                  size: columnWidthPercent,
                  type: WidthType.PERCENTAGE,
                },
              }),
            )
          }
          tableRows.push(new TableRow({ children: tableCells }))
        }
        if (tableRows.length > 0) {
          result.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              layout: TableLayoutType.AUTOFIT,
            }),
          )
        }
      }
      break

    case 'clause':
      if (node.content) {
        for (const child of node.content) {
          result.push(...(await convertNode(child as TipTapNode, runtimeContext)))
        }
      }
      break

    default:
      if (node.content) {
        result.push(
          new Paragraph({
            children: await convertInlineContent(node.content, runtimeContext),
            alignment,
            indent,
            spacing: { after: 120, line: 360 },
          })
        )
      }
  }

  return result
}

function isKeyValueTableLayout(rows: TipTapNode[][]): boolean {
  if (rows.length < 2) return false
  const twoColumnRows = rows.filter((cells) => cells.length === 2)
  if (twoColumnRows.length < 2) return false
  const firstRowCells = rows[0]
  const firstCellText = getCellPlainText(firstRowCells[0]).trim().toLowerCase()
  const secondCellText = getCellPlainText(firstRowCells[1]).trim().toLowerCase()
  const isKnownHeader =
    (firstCellText === 'mục' && secondCellText === 'chi tiết') ||
    (firstCellText === 'item' && secondCellText === 'detail')
  if (isKnownHeader) return true
  const shortLabelRows = twoColumnRows
    .slice(0, 6)
    .filter(([cell]) => getCellPlainText(cell).trim().length <= 40)
  return shortLabelRows.length >= 3
}

function convertKeyValueTableToParagraphs(rows: TipTapNode[][]): Paragraph[] {
  const bodyRows = rows.slice(1)
  const paragraphs = bodyRows.map((cells) => {
    const left = getCellPlainText(cells[0]).trim()
    const right = getCellPlainText(cells[1]).trim()
    const composedText = right ? `${left}: ${right}` : `${left}:`
    return new Paragraph({
      children: [new TextRun({ text: composedText || '' })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
    })
  })
  return paragraphs.length > 0
    ? paragraphs
    : [new Paragraph({ children: [new TextRun({ text: '' })] })]
}

function getCellPlainText(cell: TipTapNode | undefined): string {
  if (!cell?.content) return ''
  return cell.content
    .map((child) => getNodePlainText(child))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getNodePlainText(node: TipTapNode): string {
  if (node.type === 'text') return node.text || ''
  if (node.type === 'mergeField' || node.type === 'field') {
    const key = (node.attrs?.fieldKey as string | undefined)?.trim()
    return key ? `{{${key}}}` : ''
  }
  if (!node.content) return ''
  return node.content.map((child) => getNodePlainText(child)).join(' ')
}

async function convertInlineContent(
  content: TipTapNode[],
  runtimeContext?: ExportRuntimeContext,
  renderOptions?: InlineRenderOptions,
): Promise<InlineDocChild[]> {
  const runs: InlineDocChild[] = []
  const defaultHalfPointSize = renderOptions?.defaultFontSizeHalfPoint ?? 24

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
      const fontColor = textStyleMark?.attrs?.color as string | undefined
      
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
          bold: renderOptions?.forceBold ? true : isBold,
          italics: isItalic,
          underline: isUnderline ? {} : undefined,
          color: normalizeDocxColor(fontColor),
          font: fontFamily || "Times New Roman",
          size: size ?? defaultHalfPointSize,
        })
      )
    } else if (node.type === 'image') {
      const imageSrc = (node.attrs?.src as string | undefined)?.trim()
      const imageWidth =
        typeof node.attrs?.width === 'number'
          ? (node.attrs.width as number)
          : undefined
      if (!imageSrc) continue
      const imageRun = await convertImageNodeToRun(
        imageSrc,
        runtimeContext,
        imageWidth,
      )
      if (imageRun) runs.push(imageRun)
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

function normalizeDocxColor(color?: string): string | undefined {
  if (!color) return undefined
  const cleaned = color.replace('#', '').trim()
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned.toUpperCase()
  return undefined
}

async function convertImageNodeToRun(
  src: string,
  runtimeContext?: ExportRuntimeContext,
  preferredWidth?: number,
): Promise<ImageRun | null> {
  try {
    const targetUrl = toAbsoluteUrl(src, runtimeContext?.requestOrigin)
    const response = await fetch(targetUrl, {
      headers: runtimeContext?.requestCookie
        ? { Cookie: runtimeContext.requestCookie }
        : undefined,
      cache: 'no-store',
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || ''
    const imageData = Buffer.from(await response.arrayBuffer())
    const intrinsicSize = getImageSize(imageData, contentType)
    const maxExportWidth = 520
    const requestedWidth = Math.max(
      80,
      Math.min(
        maxExportWidth,
        Math.round(
          typeof preferredWidth === 'number' && preferredWidth > 0
            ? preferredWidth
            : intrinsicSize?.width ?? maxExportWidth,
        ),
      ),
    )
    const requestedHeight = intrinsicSize
      ? Math.max(60, Math.round((intrinsicSize.height * requestedWidth) / intrinsicSize.width))
      : Math.round(requestedWidth * 0.65)
    if (contentType.includes('png')) {
      return new ImageRun({
        data: imageData,
        type: 'png',
        transformation: { width: requestedWidth, height: requestedHeight },
      })
    }
    if (contentType.includes('gif')) {
      return new ImageRun({
        data: imageData,
        type: 'gif',
        transformation: { width: requestedWidth, height: requestedHeight },
      })
    }
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      return new ImageRun({
        data: imageData,
        type: 'jpg',
        transformation: { width: requestedWidth, height: requestedHeight },
      })
    }
    return null
  } catch {
    return null
  }
}

function toAbsoluteUrl(src: string, origin?: string): string {
  if (/^https?:\/\//i.test(src)) return src
  if (!origin) return src
  if (src.startsWith('/')) return `${origin}${src}`
  return `${origin}/${src}`
}

function getImageSize(
  input: Buffer,
  contentType: string,
): { width: number; height: number } | null {
  if (contentType.includes('png')) return getPngSize(input)
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return getJpegSize(input)
  if (contentType.includes('gif')) return getGifSize(input)
  return null
}

function getPngSize(input: Buffer): { width: number; height: number } | null {
  if (input.length < 24) return null
  const width = input.readUInt32BE(16)
  const height = input.readUInt32BE(20)
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function getGifSize(input: Buffer): { width: number; height: number } | null {
  if (input.length < 10) return null
  const width = input.readUInt16LE(6)
  const height = input.readUInt16LE(8)
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function getJpegSize(input: Buffer): { width: number; height: number } | null {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return null
  let offset = 2
  while (offset < input.length) {
    if (input[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = input[offset + 1]
    const blockLength = input.readUInt16BE(offset + 2)
    const isSofMarker =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    if (isSofMarker && offset + 8 < input.length) {
      const height = input.readUInt16BE(offset + 5)
      const width = input.readUInt16BE(offset + 7)
      if (width > 0 && height > 0) return { width, height }
      return null
    }
    if (blockLength <= 2) break
    offset += 2 + blockLength
  }
  return null
}

