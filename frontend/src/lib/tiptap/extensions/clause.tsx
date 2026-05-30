import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import React from 'react'

export const ClauseComponent = ({ node, selected }: NodeViewProps) => {
  const id = (node.attrs as { id?: string }).id || ''
  const title = (node.attrs as { title?: string }).title || ''
  const status = (node.attrs as { status?: string }).status || 'active'

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const supersededByDoc = (node.attrs as { supersededByDocumentId?: string }).supersededByDocumentId
    const supersededByClause = (node.attrs as { supersededByClauseId?: string }).supersededByClauseId
    
    if (supersededByDoc) {
      window.dispatchEvent(
        new CustomEvent('lawzy:compare-clause', {
          detail: {
            clauseId: id,
            title: title || 'Điều khoản',
            supersededByDocumentId: supersededByDoc,
            supersededByClauseId: supersededByClause,
          },
        })
      )
    }
  }

  return (
    <NodeViewWrapper 
      className={[
        'clause-block relative border rounded-xl my-6 p-5 transition-all duration-300',
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : status === 'superseded'
            ? 'border-orange-300 bg-orange-50/10 dark:bg-orange-950/10'
            : 'border-border hover:border-muted-foreground/30'
      ].join(' ')}
      data-clause-id={id}
    >
      {/* Header bar of the clause */}
      <div className="flex items-center justify-between text-xs text-muted-foreground select-none pb-2 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold px-2 py-0.5 bg-muted rounded text-foreground">
            {title || 'Điều khoản'}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/60">{id.slice(0, 8)}</span>
        </div>
        {status === 'superseded' && (
          <div 
            onClick={handleCompareClick}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-medium cursor-pointer hover:bg-orange-200 transition-colors"
            title="Nhấp để xem so sánh chéo"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Đã bị thay thế
          </div>
        )}
      </div>

      {/* Editor Content Area */}
      <NodeViewContent className="clause-content-area outline-none min-h-[20px]" />
    </NodeViewWrapper>
  )
}

export const ClauseExtension = Node.create({
  name: 'clause',

  group: 'block',

  content: 'block+', // Allow block nodes inside the clause (paragraphs, lists, headings)

  defining: true, // Make sure copy-paste keeps the clause node container

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-clause-id'),
        renderHTML: (attributes) => ({
          'data-clause-id': attributes.id,
        }),
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-clause-title'),
        renderHTML: (attributes) => ({
          'data-clause-title': attributes.title,
        }),
      },
      status: {
        default: 'active',
        parseHTML: (element) => element.getAttribute('data-clause-status'),
        renderHTML: (attributes) => ({
          'data-clause-status': attributes.status,
        }),
      },
      supersededByDocumentId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-clause-superseded-by-doc'),
        renderHTML: (attributes) => ({
          'data-clause-superseded-by-doc': attributes.supersededByDocumentId,
        }),
      },
      supersededByClauseId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-clause-superseded-by-clause'),
        renderHTML: (attributes) => ({
          'data-clause-superseded-by-clause': attributes.supersededByClauseId,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-clause-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'clause-block' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ClauseComponent)
  },
})
