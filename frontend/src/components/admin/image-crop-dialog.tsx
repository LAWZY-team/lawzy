"use client"

import { useState, useRef } from "react"
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ImageCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onCropComplete: (file: File) => Promise<void>
  aspectRatio?: number
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    let initialCrop: Crop
    if (aspectRatio) {
      initialCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, aspectRatio, width, height),
        width,
        height
      )
    } else {
      initialCrop = {
        unit: "%",
        x: 5,
        y: 5,
        width: 90,
        height: 90,
      }
    }
    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
  }

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) {
      onOpenChange(false)
      return
    }

    setIsProcessing(true)
    try {
      const canvas = document.createElement("canvas")
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height
      canvas.width = completedCrop.width * scaleX
      canvas.height = completedCrop.height * scaleY
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        throw new Error("No 2d context")
      }

      ctx.imageSmoothingQuality = "high"

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      )

      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Canvas is empty")
        }
        const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" })
        await onCropComplete(file)
        setIsProcessing(false)
        onOpenChange(false)
      }, "image/jpeg", 0.95)
    } catch (e) {
      console.error("Crop error", e)
      setIsProcessing(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-full">
        <DialogHeader>
          <DialogTitle>Cắt và chỉnh sửa ảnh</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center max-h-[60vh] overflow-hidden bg-black/5 rounded-md p-2">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
            >
              <img
                ref={imgRef}
                alt="Crop preview"
                src={imageSrc}
                crossOrigin="anonymous"
                onLoad={onImageLoad}
                style={{
                  maxHeight: "60vh",
                  maxWidth: "100%",
                  width: "auto",
                  height: "auto",
                  display: "block",
                }}
              />
            </ReactCrop>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || !completedCrop?.width}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận & Tải lên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
