import type { ReactNode } from 'react'

export const ACCEPT_ATTACH =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Render text with **...** as bold (dùng cho nội dung phản hồi assistant có markdown đơn giản) */
export function renderSimpleMarkdown(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length <= 1) return text
  return parts.map((segment, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-[#E3E3E3]">
        {segment}
      </strong>
    ) : (
      segment
    )
  )
}

export function acceptFile(file: File): boolean {
  const n = file.name.toLowerCase()
  return (n.endsWith('.pdf') || n.endsWith('.doc') || n.endsWith('.docx')) && /\.(pdf|doc|docx)$/i.test(file.name)
}
