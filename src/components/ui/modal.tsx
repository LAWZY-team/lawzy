"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const modalSizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-6xl",
  /** Gần full màn hình — ghi đè sm:max-w-lg của Dialog để modal rộng theo viewport */
  full: "!max-w-[95vw] w-full h-[90vh] min-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col",
} as const

export type ModalSize = keyof typeof modalSizes

export interface ModalProps {
  /** Controlled open state */
  open: boolean
  /** Called when open state should change (e.g. overlay click, Escape) */
  onOpenChange?: (open: boolean) => void
  /** Alias for onOpenChange - called when modal should close */
  onClose?: () => void
  /** Modal content */
  children: React.ReactNode
  /** Optional title (accessible) */
  title?: string
  /** Optional description (accessible) */
  description?: string
  /** Size preset. Default: md */
  size?: ModalSize
  /** Show default close button in corner. Default: true */
  showCloseButton?: boolean
  /** Extra class for the content container */
  className?: string
  /** Prevent closing on overlay click or Escape when true */
  preventClose?: boolean
}

export function Modal({
  open,
  onOpenChange,
  onClose,
  children,
  title,
  description,
  size = "md",
  showCloseButton = true,
  className,
  preventClose = false,
}: ModalProps) {
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next && preventClose) return
      onOpenChange?.(next)
      if (!next) onClose?.()
    },
    [onOpenChange, onClose, preventClose]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          size === "full" ? modalSizes.full : modalSizes[size],
          className
        )}
        onPointerDownOutside={preventClose ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={preventClose ? (e) => e.preventDefault() : undefined}
      >
        {title && (
          <DialogTitle className="sr-only">{title}</DialogTitle>
        )}
        {description && (
          <DialogDescription className="sr-only">{description}</DialogDescription>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}
