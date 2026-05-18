"use client"

import { useCallback, useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import FontFamily from "@tiptap/extension-font-family"
import { FontSize } from "./tiptap-font-size"
import { ResizableImage } from "./tiptap-resizable-image"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyleKit } from "@tiptap/extension-text-style"
import Underline from "@tiptap/extension-underline"
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  ImageIcon,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUploadArticleImage } from "@/hooks/articles/use-upload-article-image"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const ARTICLE_BODY_CLASSES = [
  "min-h-[400px] p-6 pb-24 text-foreground",
  "[&_.ProseMirror]:min-h-[380px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-foreground",
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:first:mt-0",
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1",
  "[&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:mb-3",
  "[&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:p-2 [&_td]:p-2",
].join(" ")

const FONT_FAMILIES = [
  { name: "Mặc định", value: "" },
  { name: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { name: "Arial", value: "Arial, Helvetica, sans-serif" },
  { name: "Courier New", value: "'Courier New', Courier, monospace" },
  { name: "Noto Sans", value: "'Noto Sans', sans-serif" },
  { name: "Cambria", value: "Cambria, Georgia, serif" },
]

const FONT_SIZES = [
              "8pt",
              "9pt",
              "10pt",
              "11pt",
              "12pt",
              "13pt",
              "14pt",
              "16pt",
              "18pt",
              "20pt",
              "24pt",
              "28pt",
              "36pt",
              "48pt",
              "72pt",
]


interface ArticleCanvasEditorProps {
  content?: string
  placeholder?: string
  onChange: (html: string) => void
  className?: string
  minHeight?: string
}

export function ArticleCanvasEditor({
  content,
  placeholder = "Nhập nội dung bài viết...",
  onChange,
  className,
  minHeight = "min-h-[400px]",
}: ArticleCanvasEditorProps) {
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
      TextStyleKit.configure({
        backgroundColor: false,
        color: false,
        lineHeight: false,
        fontFamily: { types: ["textStyle"] },
        fontSize: { types: ["textStyle"] },
      }),
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
      ResizableImage.configure({
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
            if (url) editor?.chain().focus().setImage({ src: url, originalSrc: url } as any).run()
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
                  if (url) editor?.chain().focus().setImage({ src: url, originalSrc: url } as any).run()
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
    if (url) editor?.chain().focus().setImage({ src: url, originalSrc: url } as any).run()
    e.target.value = ""
  }

  if (!editor) return null

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-3 py-2 bg-muted/30">
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
          className="h-8 gap-1.5"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          <span className="text-xs">Chèn ảnh</span>
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-foreground">
              <span className="text-xs max-w-[80px] truncate">
                {editor.getAttributes("textStyle").fontFamily
                  ? FONT_FAMILIES.find(f => f.value === editor.getAttributes("textStyle").fontFamily)?.name || "Font"
                  : "Font"}
              </span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="h-[200px] overflow-y-auto">
            {FONT_FAMILIES.map((font) => (
              <DropdownMenuItem
                key={font.name}
                onClick={() => {
                  if (font.value) editor.chain().focus().setFontFamily(font.value).run()
                  else editor.chain().focus().unsetFontFamily().run()
                }}
                style={{ fontFamily: font.value || "inherit" }}
              >
                {font.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-foreground px-2">
              <span className="text-xs">
                {editor.getAttributes("textStyle").fontSize || "Size"}
              </span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="h-[200px] overflow-y-auto min-w-[80px]">
            {FONT_SIZES.map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => editor.chain().focus().setFontSize(size).run()}
              >
                {size}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-foreground">
              <span className="text-xs">Kiểu văn bản</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              Văn bản thường
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              Tiêu đề 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              Tiêu đề 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              Tiêu đề 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Căn chỉnh">
              {editor.isActive({ textAlign: "center" }) ? (
                <AlignCenter className="w-4 h-4" />
              ) : editor.isActive({ textAlign: "right" }) ? (
                <AlignRight className="w-4 h-4" />
              ) : editor.isActive({ textAlign: "justify" }) ? (
                <AlignJustify className="w-4 h-4" />
              ) : (
                <AlignLeft className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              Căn trái
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              Căn giữa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              Căn phải
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
              Căn đều
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("bold") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("italic") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("underline") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-accent")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <span className="text-xs">Bảng</span>
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      <div className={cn("overflow-y-auto prose prose-sm dark:prose-invert max-w-none", minHeight)}>
        <EditorContent
          editor={editor}
          className={cn(ARTICLE_BODY_CLASSES, "[&_.ProseMirror]:outline-none")}
        />
      </div>
    </div>
  )
}
