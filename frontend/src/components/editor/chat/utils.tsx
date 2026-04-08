import type { ReactNode } from 'react'

export const ACCEPT_ATTACH =
  '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

/** Render text with **...** as bold (dùng cho nội dung phản hồi assistant có markdown đơn giản) */
export function renderSimpleMarkdown(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length <= 1) return text
  return parts.map((segment, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {segment}
      </strong>
    ) : (
      segment
    )
  )
}

export function acceptFile(file: File): boolean {
  return /\.(pdf|doc|docx|txt)$/i.test(file.name)
}
