'use client'

import { useState } from 'react'
import { renderSimpleMarkdown } from './utils'

interface ExpandableMessageProps {
  content: string
  isStreaming?: boolean
  role: 'user' | 'assistant'
}

export function ExpandableMessage({ content, isStreaming, role }: ExpandableMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const maxLength = role === 'user' ? 300 : 2000
  const useMarkdown = role === 'assistant'

  if (content.length <= maxLength || isStreaming) {
    return (
      <div className="whitespace-pre-wrap markdown-content">
        {useMarkdown ? renderSimpleMarkdown(content) : content}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-2 align-middle bg-blue-400 animate-pulse" />
        )}
      </div>
    )
  }

  const displayContent = isExpanded ? content : `${content.slice(0, maxLength)}...`
  return (
    <div className="flex flex-col items-start">
      <div className="whitespace-pre-wrap markdown-content">
        {useMarkdown ? renderSimpleMarkdown(displayContent) : displayContent}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-blue-500 hover:text-blue-700 mt-1 font-medium hover:underline focus:outline-none"
      >
        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
      </button>
    </div>
  )
}
