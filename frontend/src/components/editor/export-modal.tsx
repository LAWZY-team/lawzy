"use client"

import * as React from "react"
import { Download, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export function ExportModal() {
  const [format, setFormat] = React.useState("docx")
  const [includeMetadata, setIncludeMetadata] = React.useState(true)
  const [includeClauseTags, setIncludeClauseTags] = React.useState(false)

  const handleExport = async () => {
    if (format === 'gdoc' || format === 'pdf') {
      toast.info('Chức năng này sẽ được triển khai trong phiên bản Pro')
      return
    }

    toast.loading('Đang xuất file...')

    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {},
          metadata: { title: 'Hop dong' },
        }),
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contract.docx'
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('Xuất file thành công!')
    } catch (error) {
      console.error(error)
      toast.error('Có lỗi xảy ra khi xuất file')
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Xuất file
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất hợp đồng</DialogTitle>
          <DialogDescription>
            Chọn định dạng và tùy chọn xuất file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="format">Định dạng</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docx">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Word (.docx)
                  </div>
                </SelectItem>
                <SelectItem value="gdoc">Google Docs</SelectItem>
                <SelectItem value="pdf">PDF (Pro)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Tùy chọn</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
              />
              <label
                htmlFor="metadata"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Bao gồm metadata
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clauseTags"
                checked={includeClauseTags}
                onCheckedChange={(checked) => setIncludeClauseTags(checked as boolean)}
              />
              <label
                htmlFor="clauseTags"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Bao gồm clause tags
              </label>
            </div>
          </div>

          <Button className="w-full" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Xuất file
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
