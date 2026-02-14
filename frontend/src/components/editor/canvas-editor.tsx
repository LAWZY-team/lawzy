"use client"

/**
 * Canvas editor cho hợp đồng — hiển thị và chỉnh sửa nội dung từ template hoặc AI.
 * Bố cục chuẩn VN (quốc hiệu, tiêu đề căn giữa, căn cứ/lời mở đầu/điều khoản căn trái)
 * được định nghĩa trong src/lib/contract-layout.ts và áp dụng khi render preview (template-preview).
 * Nội dung load từ template đã có align/divider; khi cần căn chỉnh trong editor có thể bổ sung
 * extension text-align cho TipTap.
 */
import { useState } from 'react'
import { EditorContent, Editor } from '@tiptap/react'
import { useEditorStore } from '@/stores/editor-store'
import { 
  X, Play, MoreHorizontal, FileText, Code, 
  Bold, Italic, List, ListOrdered, Undo, Redo, ChevronDown,
  Download, Printer, PanelRightOpen, PanelRightClose,
  Save, Copy, HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CanvasEditorProps {
  editor: Editor | null
  title?: string
  onClose: () => void
  onRun?: () => void
  isCode?: boolean
  /** Panel công cụ (Dữ liệu, Thông tin) đang mở */
  toolsPanelOpen?: boolean
  /** Bật/tắt panel công cụ */
  onToggleTools?: () => void
  /** Gọi khi chọn "Lưu bản nháp" trong menu */
  onSave?: () => void
}

export function CanvasEditor({ 
  editor, 
  title = "Hợp đồng chưa đặt tên", 
  onClose, 
  onRun, 
  isCode = false,
  toolsPanelOpen = true,
  onToggleTools,
  onSave,
}: CanvasEditorProps) {
  const [docTitle, setDocTitle] = useState(title)
  const { mergeFieldValues } = useEditorStore()

  if (!editor) return null

  /** Thay thế các span trường trộn (data-field-key) bằng giá trị thực để in/xuất PDF/Word đúng nội dung */
  const replaceMergeFieldsWithValues = (html: string): string => {
    if (Object.keys(mergeFieldValues).length === 0) return html
    const div = document.createElement('div')
    div.innerHTML = html
    div.querySelectorAll('[data-field-key]').forEach((el) => {
      const key = el.getAttribute('data-field-key')
      if (key && mergeFieldValues[key] !== undefined && mergeFieldValues[key] !== '') {
        el.textContent = mergeFieldValues[key]
        el.classList.remove('merge-field')
        ;(el as HTMLElement).style.fontWeight = 'inherit'
        ;(el as HTMLElement).style.background = 'none'
        ;(el as HTMLElement).style.border = 'none'
        ;(el as HTMLElement).style.padding = '0'
      }
    })
    return div.innerHTML
  }

  const handlePrint = () => {
    const html = replaceMergeFieldsWithValues(editor.getHTML())
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      window.print()
      return
    }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle || 'Hợp đồng'}</title>
      <style>body{font-family:system-ui,serif;max-width:210mm;margin:auto;padding:20px;line-height:1.6}
      h1{font-size:1.5rem;margin:0.5em 0}h2{font-size:1.25rem;margin:0.5em 0}p{margin:0.4em 0}</style></head>
      <body>${html}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const handleExportWord = () => {
    if (!editor) return
    const htmlContent = replaceMergeFieldsWithValues(editor.getHTML())
    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>"
    const postHtml = "</body></html>"
    const blob = new Blob([preHtml + htmlContent + postHtml], {
      type: 'application/msword'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${docTitle || 'document'}.doc`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportHTML = () => {
    if (!editor) return
    const htmlContent = replaceMergeFieldsWithValues(editor.getHTML())
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${docTitle || 'document'}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyContent = async () => {
    if (!editor) return
    const text = editor.getText()
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Đã sao chép nội dung')
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#131314] text-[#E3E3E3] rounded-3xl overflow-hidden border border-[#2D2D2D] my-2 mr-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2D2D2D] bg-[#131314] z-20 sticky top-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 bg-[#2D2D2D] rounded-lg">
            {isCode ? <Code className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-purple-400" />}
          </div>
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="bg-transparent border-none outline-none font-medium text-sm text-[#E3E3E3] truncate w-[200px] hover:bg-[#2D2D2D]/50 px-2 py-1 rounded transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-1">
          {isCode && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRun}
              className="text-[#E3E3E3] hover:bg-[#2D2D2D] gap-2 h-8 px-3 rounded-full mr-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="text-xs font-medium">Kiểm tra</span>
            </Button>
          )}

          {onToggleTools && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTools}
              className={cn(
                "h-8 w-8 rounded-full",
                toolsPanelOpen ? "text-[#E3E3E3] bg-[#2D2D2D]" : "text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D]"
              )}
              title={toolsPanelOpen ? "Đóng công cụ" : "Mở công cụ"}
            >
              {toolsPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D] h-8 w-8 rounded-full" title="Xuất văn bản">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#131314] border-[#2D2D2D] text-[#E3E3E3]">
              <DropdownMenuItem onClick={handlePrint} className="hover:bg-[#2D2D2D] cursor-pointer">
                <Printer className="w-4 h-4 mr-2" /> In / Lưu PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2D2D2D]" />
              <DropdownMenuItem onClick={handleExportWord} className="hover:bg-[#2D2D2D] cursor-pointer">
                <FileText className="w-4 h-4 mr-2" /> Xuất Word (.doc)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportHTML} className="hover:bg-[#2D2D2D] cursor-pointer">
                <Code className="w-4 h-4 mr-2" /> Xuất HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D] h-8 w-8 rounded-full" title="Thêm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#131314] border-[#2D2D2D] text-[#E3E3E3]">
              {onSave && (
                <>
                  <DropdownMenuItem onClick={onSave} className="hover:bg-[#2D2D2D] cursor-pointer">
                    <Save className="w-4 h-4 mr-2" /> Lưu bản nháp
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#2D2D2D]" />
                </>
              )}
              <DropdownMenuItem onClick={handleCopyContent} className="hover:bg-[#2D2D2D] cursor-pointer">
                <Copy className="w-4 h-4 mr-2" /> Sao chép nội dung
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint} className="hover:bg-[#2D2D2D] cursor-pointer">
                <Printer className="w-4 h-4 mr-2" /> Chế độ in
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2D2D2D]" />
              <DropdownMenuItem className="hover:bg-[#2D2D2D] cursor-pointer" onClick={() => toast.info("Trợ giúp: Liên hệ support@lawzy.vn")}>
                <HelpCircle className="w-4 h-4 mr-2" /> Trợ giúp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-4 w-[1px] bg-[#2D2D2D] mx-1"></div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D] h-8 w-8 rounded-full"
            title="Đóng canvas"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-[#2D2D2D] bg-[#131314] flex items-center gap-1 overflow-x-auto no-scrollbar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D]">
              <span className="text-xs">Kiểu văn bản</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#131314] border-[#2D2D2D] text-[#E3E3E3]">
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className="hover:bg-[#2D2D2D]">Văn bản thường</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="hover:bg-[#2D2D2D]">Tiêu đề 1</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="hover:bg-[#2D2D2D]">Tiêu đề 2</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="hover:bg-[#2D2D2D]">Tiêu đề 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-[1px] bg-[#2D2D2D] mx-2"></div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("h-8 w-8 rounded text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D]", editor.isActive('bold') && "bg-[#2D2D2D] text-[#E3E3E3]")}
          title="In đậm"
        >
          <Bold className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("h-8 w-8 rounded text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D]", editor.isActive('italic') && "bg-[#2D2D2D] text-[#E3E3E3]")}
          title="In nghiêng"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <div className="h-4 w-[1px] bg-[#2D2D2D] mx-2"></div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("h-8 w-8 rounded text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D]", editor.isActive('bulletList') && "bg-[#2D2D2D] text-[#E3E3E3]")}
          title="Danh sách"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("h-8 w-8 rounded text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D]", editor.isActive('orderedList') && "bg-[#2D2D2D] text-[#E3E3E3]")}
          title="Danh sách số"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="flex-1"></div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 rounded text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D] disabled:opacity-30"
          title="Hoàn tác"
        >
          <Undo className="w-4 h-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 rounded text-[#9CA3AF] hover:text-[#E3E3E3] hover:bg-[#2D2D2D] disabled:opacity-30"
          title="Làm lại"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Body — cấu trúc văn bản: heading, paragraph, căn giữa/trái */}
      <div className="flex-1 overflow-auto relative bg-[#131314]">
        <EditorContent
          editor={editor}
          className={cn(
            'min-h-full p-6 pb-24 text-[#E3E3E3]',
            '[&_.ProseMirror]:min-h-[calc(100%-48px)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[#E3E3E3]',
            '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:first:mt-0',
            '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2',
            '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1',
            '[&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:mb-3',
            '[&_.merge-field]:inline-flex [&_.merge-field]:align-baseline'
          )}
        />
      </div>
    </div>
  )
}
