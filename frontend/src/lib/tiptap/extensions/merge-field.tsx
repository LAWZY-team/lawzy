import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import React from 'react'

// Hiển thị nhãn tiếng Việt, in hoa — thống nhất với danh sách trường trộn
export const MergeFieldComponent = (props: { node: { attrs: { fieldKey?: string; label?: string } } }) => {
  const displayText = (props.node.attrs.label || props.node.attrs.fieldKey || '').toUpperCase()
  return (
    <NodeViewWrapper className="merge-field-wrapper inline">
      <span
        className="merge-field inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-sm font-medium border border-blue-200 dark:border-blue-700 uppercase"
        contentEditable={false}
        data-field-key={props.node.attrs.fieldKey}
        title={displayText}
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
