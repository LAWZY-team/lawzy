"use client"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  desc: React.ReactNode
  cancelText?: string
  confirmText?: React.ReactNode
  destructive?: boolean
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  desc,
  cancelText,
  confirmText,
  destructive,
  onConfirm,
  isLoading = false,
  disabled = false,
  className,
  children,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(className)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText ?? "Cancel"}
          </AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={disabled || isLoading}
          >
            {isLoading ? "..." : confirmText ?? "Continue"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
