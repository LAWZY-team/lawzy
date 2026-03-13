"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useT } from "@/components/i18n-provider"

interface SaveDraftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (status: 'draft' | 'completed') => void
  onDiscard: () => void
}

export function SaveDraftModal({
  open,
  onOpenChange,
  onSave,
  onDiscard,
}: SaveDraftModalProps) {
  const { t } = useT()
  const [status, setStatus] = useState<'draft' | 'completed'>('draft')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("save_draft_title") || "Lưu bản thảo?"}</DialogTitle>
          <DialogDescription>
            {t("save_draft_description") || "Bạn có thay đổi chưa lưu. Bạn có muốn lưu lại dưới dạng bản thảo trước khi rời đi không?"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block">
            {t("save_draft_status_label") || "Trạng thái hợp đồng"}
          </Label>
          <RadioGroup 
            value={status} 
            onValueChange={(v) => setStatus(v as 'draft' | 'completed')}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="draft" id="status-draft" />
              <Label htmlFor="status-draft" className="font-normal cursor-pointer">
                {t("status_draft") || "Đang soạn thảo"} (In Progress)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="completed" id="status-completed" />
              <Label htmlFor="status-completed" className="font-normal cursor-pointer">
                {t("status_completed") || "Hoàn thành"} (Complete)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onDiscard()
              onOpenChange(false)
            }}
            className="sm:order-1"
          >
            {t("save_draft_discard") || "Hủy bỏ thay đổi"}
          </Button>
          <Button
            onClick={() => {
              onSave(status)
              onOpenChange(false)
            }}
            className="sm:order-2"
          >
            {t("save_draft_save") || "Lưu bản thảo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
