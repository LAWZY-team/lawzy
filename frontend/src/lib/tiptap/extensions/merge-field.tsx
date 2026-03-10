import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import React from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { useUserFieldsStore } from '@/stores/user-fields-store'

// Hiển thị nhãn tiếng Việt, in hoa — thống nhất với danh sách trường trộn
export const MergeFieldComponent = ({ node, selected }: NodeViewProps) => {
  const fieldKey = (node.attrs as { fieldKey?: string }).fieldKey || ''
  const label = (node.attrs as { label?: string }).label || fieldKey
  const value = useEditorStore((s) => (fieldKey ? s.mergeFieldValues[fieldKey] : undefined)) ?? ''
  const isHidden = useUserFieldsStore((s) => (fieldKey ? s.hiddenFieldKeys.includes(fieldKey) : false))

  const displayText = isHidden ? '' : (value !== '' ? value : label.toUpperCase())
  return (
    <NodeViewWrapper className="merge-field-wrapper inline">
      <span
        className={[
          'inline-flex items-center px-2 py-0.5 rounded-md text-sm text-black font-medium max-w-auto truncate select-none',
          selected
            ? 'bg-blue-200 border border-blue-500 shadow-[0_0_0_1px_rgba(37,99,235,0.8)]'
            : 'bg-blue-100 border border-blue-200',
        ].join(' ')}
        contentEditable={false}
        data-field-key={fieldKey}
        title={isHidden ? `${label} (Ẩn)` : label}
      >
        {displayText}
      </span>
    </NodeViewWrapper>
  )
}

export const MergeFieldExtension = Node.create({
  name: 'mergeField',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true,

  addAttributes() {
    return {
      fieldKey: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-field-key'),
        renderHTML: (attributes) => {
          return {
            'data-field-key': attributes.fieldKey,
          }
        },
      },
      label: {
        default: '',
      },
      value: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-field-key]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'merge-field' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeFieldComponent)
  },
})
