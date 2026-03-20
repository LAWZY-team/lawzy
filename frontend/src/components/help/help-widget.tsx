"use client"

import * as React from "react"
import { motion, useAnimationControls } from "framer-motion"
import { Inbox, Image as ImageIcon, Loader2, Send, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"

const FEEDBACK_TYPES = [
  { value: "gop-y", label: "Góp ý / Phản hồi" },
  { value: "bao-loi", label: "Báo lỗi" },
  { value: "ho-tro", label: "Yêu cầu hỗ trợ" },
]

export function HelpWidget() {
  const { isAuthenticated } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [type, setType] = useState("gop-y")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  
  const controls = useAnimationControls()
  const widgetRef = useRef<HTMLDivElement>(null)
  const draggedRef = useRef(false)

  if (!isAuthenticated) return null

  // Corner snapping logic
  const handleDragEnd = (_event: unknown, info: { offset: { x: number; y: number } }) => {
    // Small delay before allowing clicks again, to ensure the 'click' event 
    // that follows 'dragEnd' is ignored if it was a drag
    setTimeout(() => {
      draggedRef.current = false
    }, 100)
    
    setIsDragging(false)
    const padding = 24
    const widgetSize = 40
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    // Get the final position relative to the initial bottom-right corner
    const { x, y } = info.offset

    // Determine which corner is closest
    const isLeft = (screenWidth - padding - widgetSize + x) < screenWidth / 2
    const isTop = (screenHeight - padding - widgetSize + y) < screenHeight / 2

    const snapX = isLeft ? -(screenWidth - widgetSize - padding * 2) : 0
    const snapY = isTop ? -(screenHeight - widgetSize - padding * 2) : 0

    controls.start({
      x: snapX,
      y: snapY,
      transition: { type: "spring", stiffness: 400, damping: 40 }
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setImages((prev) => [...prev, ...newFiles])
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) {
      toast.error("Vui lòng điền đầy đủ thông tin")
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("type", FEEDBACK_TYPES.find(t => t.value === type)?.label || type)
      formData.append("title", title)
      formData.append("description", description)
      images.forEach((image) => {
        formData.append("images", image)
      })

      const res = await fetch("/api/help-center/submit", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Gửi phản hồi thất bại")

      toast.success("Cảm ơn bạn! Phản hồi của bạn đã được gửi.")
      setIsOpen(false)
      // Reset form
      setTitle("")
      setDescription("")
      setImages([])
      setPreviews([])
    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <motion.div
        ref={widgetRef}
        drag={!isOpen}
        dragConstraints={{
          left: typeof window !== 'undefined' ? -(window.innerWidth - 40 - 48) : 0,
          right: 0,
          top: typeof window !== 'undefined' ? -(window.innerHeight - 40 - 48) : 0,
          bottom: 0,
        }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => {
          setIsDragging(true)
          draggedRef.current = false
        }}
        onDrag={(e, info) => {
          if (Math.abs(info.delta.x) > 0.5 || Math.abs(info.delta.y) > 0.5) {
            draggedRef.current = true
          }
        }}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="pointer-events-auto cursor-grab active:cursor-grabbing"
        initial={{ x: 0, y: 0 }}
      >
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95",
                "bg-black hover:bg-black/80 text-white"
              )}
              onClick={(e) => {
                if (draggedRef.current) {
                  e.preventDefault()
                  e.stopPropagation()
                  return
                }
              }}
            >
              <Inbox className="h-7 w-7" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="end" 
            className="w-80 sm:w-96 p-0 overflow-hidden border-orange-100 shadow-2xl"
          >
            <div className="bg-black p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                
                <h3 className="font-semibold">Help Center</h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/80 h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="type">Bạn cần hỗ trợ gì?</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Chọn loại yêu cầu" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  placeholder="Vấn đề bạn đang gặp phải..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả chi tiết <span className="text-destructive">*</span></Label>
                <Textarea
                  id="description"
                  placeholder="Hãy mô tả chi tiết để chúng tôi hỗ trợ bạn tốt nhất..."
                  className="min-h-[100px] resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Đính kèm hình ảnh (tối đa 5)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {previews.map((src, i) => (
                    <div key={src} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                      <img src={src} alt="preview" className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-0 right-0 p-0.5 bg-black/50 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <Label
                      htmlFor="image-upload"
                      className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <ImageIcon className="h-5 w-5 mb-1" />
                      <span className="text-[10px]">Thêm</span>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={isLoading}
                      />
                    </Label>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-black/80 text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>Gửi yêu cầu
                  </>
                )}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      </motion.div>
    </div>
  )
}
