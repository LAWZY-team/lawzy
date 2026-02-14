"use client"

import type { JSONContent } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { MergeFieldExtension } from '@/lib/tiptap/extensions/merge-field'

interface TipTapEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent) => void
  editable?: boolean
}

export function TipTapEditor({ content, onChange, editable = true }: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyleKit.configure({
        backgroundColor: false,
        color: false,
        lineHeight: false,
        fontFamily: { types: ['textStyle'] },
        fontSize: { types: ['textStyle'] },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: 'Nhập nội dung hợp đồng hoặc sử dụng AI để tạo...',
      }),
      MergeFieldExtension,
    ],
    content: content || {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'HỢP ĐỒNG MỚI' }],
        },
        {
          type: 'paragraph',
        },
      ],
    },
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[600px] p-8',
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON())
      }
    },
  })

  return (
    <div className="border rounded-lg bg-background">
      <EditorContent editor={editor} />
    </div>
  )
}
