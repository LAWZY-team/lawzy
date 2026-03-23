"use client"

import { useCallback, useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import { useUploadArticleImage } from "@/hooks/articles/use-upload-article-image"
import { Button } from "@/components/ui/button"
import { ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ArticleRichEditorProps {
  content?: string
  placeholder?: string
  onChange: (html: string) => void
  className?: string
  minHeight?: string
}

export function ArticleRichEditor({
  content,
  placeholder = "Nhập nội dung bài viết...",
  onChange,
  className,
  minHeight = "min-h-[320px]",
}: ArticleRichEditorProps) {
  const uploadMutation = useUploadArticleImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        const result = await uploadMutation.mutateAsync(file)
        return result.url
      } catch (err) {
        toast.error((err as Error).message)
        return null
      }
    },
    [uploadMutation]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
    ],
    content: content && content.trim() ? content : "<p></p>",
    editorProps: {
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files
        if (files?.length && files[0].type.startsWith("image/")) {
          event.preventDefault()
          handleImageUpload(files[0]).then((url) => {
            if (url) editor?.chain().focus().setImage({ src: url }).run()
          })
        }
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile()
              if (file) {
                event.preventDefault()
                handleImageUpload(file).then((url) => {
                  if (url) editor?.chain().focus().setImage({ src: url }).run()
                })
                return
              }
            }
          }
        }
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    if (content && content.trim() && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file?.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)")
      return
    }
    const url = await handleImageUpload(file)
    if (url) editor?.chain().focus().setImage({ src: url }).run()
    e.target.value = ""
  }

  return (
    <div className={cn("rounded-lg border bg-background", className)}>
      <div className="flex items-center gap-1 border-b px-2 py-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={onFileSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          <span className="ml-1.5">Chèn ảnh</span>
        </Button>
      </div>
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none",
          minHeight
        )}
      >
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
        />
      </div>
    </div>
  )
}
