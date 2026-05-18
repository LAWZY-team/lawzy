import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import Image from "@tiptap/extension-image"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Crop, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageCropDialog } from "@/components/admin/image-crop-dialog"
import { api } from "@/lib/api/client"
import { toast } from "sonner"

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src") || element.querySelector("img")?.getAttribute("src") || null,
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width") || element.querySelector("img")?.getAttribute("width") || null,
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height") || element.querySelector("img")?.getAttribute("height") || null,
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute("alt") || element.querySelector("img")?.getAttribute("alt") || null,
      },
      originalSrc: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-original-src") ||
          element.querySelector("img")?.getAttribute("data-original-src") ||
          element.getAttribute("src") ||
          element.querySelector("img")?.getAttribute("src") ||
          null,
        renderHTML: (attributes) => {
          if (!attributes.originalSrc) {
            return {}
          }
          return {
            "data-original-src": attributes.originalSrc,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (dom) => {
          const img = (dom as HTMLElement).querySelector("img")
          if (!img) return false
          return {
            src: img.getAttribute("src"),
            originalSrc: img.getAttribute("data-original-src") || img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
          }
        },
      },
      {
        tag: "img[src]",
        getAttrs: (dom) => {
          const img = dom as HTMLElement
          return {
            src: img.getAttribute("src"),
            originalSrc: img.getAttribute("data-original-src") || img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    if (HTMLAttributes.alt) {
      const { style, ...rest } = HTMLAttributes
      return [
        "figure",
        {
          class: "image-figure flex flex-col items-center justify-center my-6 mx-auto",
          style: HTMLAttributes.width
            ? `width: ${HTMLAttributes.width}px; max-width: 100%;`
            : "max-width: 100%;",
        },
        ["img", { ...rest, class: "rounded-lg w-full" }],
        [
          "figcaption",
          {
            class:
              "text-center text-sm text-muted-foreground mt-2 italic border-b border-gray-100 pb-2 w-full",
          },
          HTMLAttributes.alt,
        ],
      ]
    }
    return ["img", HTMLAttributes]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})

function ImageNodeView({ node, updateAttributes, selected }: any) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [altText, setAltText] = useState(node.attrs.alt || "")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setAltText(node.attrs.alt || "")
  }, [node.attrs.alt])

  const onMouseDown = (e: React.MouseEvent, corner: string) => {
    e.preventDefault()
    const startX = e.pageX
    const startY = e.pageY
    const startWidth = imageRef.current?.offsetWidth || 0
    const startHeight = imageRef.current?.offsetHeight || 0

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.pageX - startX
      const dy = e.pageY - startY
      let newWidth = startWidth
      let newHeight = startHeight

      if (corner === "bottom-right") {
        newWidth = startWidth + dx
        newHeight = startHeight + dy
      } else if (corner === "bottom-left") {
        newWidth = startWidth - dx
        newHeight = startHeight + dy
      } else if (corner === "top-right") {
        newWidth = startWidth + dx
        newHeight = startHeight - dy
      } else if (corner === "top-left") {
        newWidth = startWidth - dx
        newHeight = startHeight - dy
      }

      // Maintain aspect ratio
      const aspectRatio = startWidth / startHeight
      newHeight = newWidth / aspectRatio

      updateAttributes({ width: Math.max(50, newWidth), height: Math.max(50, newHeight) })
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  const handleCropComplete = async (file: File) => {
    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)
      const response = await api.upload<{ url: string }>("/articles/upload-image", formData)

      updateAttributes({
        src: response.url,
        width: null,
        height: null,
      })
      toast.success("Đã cắt và cập nhật ảnh thành công!")
    } catch (err) {
      toast.error((err as Error).message || "Không thể tải lên ảnh cắt")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <NodeViewWrapper
      className={cn(
        "relative inline-block max-w-full my-4 group text-center",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="relative inline-block">
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          className="max-w-full block rounded-md"
          style={{
            width: node.attrs.width ? `${node.attrs.width}px` : "auto",
            height: node.attrs.height ? `${node.attrs.height}px` : "auto",
          }}
        />

        {selected && (
          <>
            <div
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary cursor-nwse-resize border-2 border-white rounded-full z-10"
              onMouseDown={(e) => onMouseDown(e, "top-left")}
            />
            <div
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary cursor-nesw-resize border-2 border-white rounded-full z-10"
              onMouseDown={(e) => onMouseDown(e, "top-right")}
            />
            <div
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary cursor-nesw-resize border-2 border-white rounded-full z-10"
              onMouseDown={(e) => onMouseDown(e, "bottom-left")}
            />
            <div
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary cursor-nwse-resize border-2 border-white rounded-full z-10"
              onMouseDown={(e) => onMouseDown(e, "bottom-right")}
            />
          </>
        )}
      </div>

      {node.attrs.alt && (
        <div
          className="text-center text-xs text-muted-foreground mt-2 italic border-b border-gray-100 pb-2 mx-auto select-none"
          style={{
            width: node.attrs.width ? `${node.attrs.width}px` : "100%",
            maxWidth: "100%",
          }}
        >
          {node.attrs.alt}
        </div>
      )}

      <div
        className={cn(
          "absolute -bottom-14 left-1/2 -translate-x-1/2 justify-center z-20 transition-all duration-200",
          selected || isInputFocused ? "flex" : "hidden"
        )}
      >
        <div className="bg-popover shadow-lg border rounded-md p-1.5 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap pl-1">
            Alt:
          </span>
          <Input
            placeholder="Văn bản thay thế (SEO)..."
            className="h-7 w-56 text-xs"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              setIsInputFocused(false)
              updateAttributes({ alt: altText })
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                updateAttributes({ alt: altText })
              }
            }}
          />
          <div className="h-4 w-[1px] bg-border" />
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 text-xs flex items-center gap-1 hover:bg-muted font-normal text-muted-foreground hover:text-foreground"
            onClick={() => setCropDialogOpen(true)}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Crop className="h-3.5 w-3.5" />
            )}
            Cắt ảnh
          </Button>
        </div>
      </div>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={node.attrs.originalSrc || node.attrs.src}
        onCropComplete={handleCropComplete}
      />
    </NodeViewWrapper>
  )
}

