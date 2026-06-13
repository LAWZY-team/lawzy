"use client"

import * as React from "react"
import { useState } from "react"
import { TRTable, MockColumn, MockDocument, MockCell } from "./tr-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Upload, Play, Download, Settings, Trash2, Loader2 } from "lucide-react"

// MOCK DATA: Giả lập dữ liệu ban đầu
const MOCK_COLUMNS: MockColumn[] = [
  { id: "col-1", name: "Tên các bên", description: "Trích xuất tên của các bên tham gia ký kết hợp đồng, bao gồm cả tên viết tắt nếu có." },
  { id: "col-2", name: "Thời hạn hợp đồng", description: "Hợp đồng có hiệu lực từ ngày nào đến ngày nào? Có điều khoản tự động gia hạn không?" },
  { id: "col-3", name: "Giá trị và thanh toán", description: "Tổng giá trị hợp đồng và phương thức, tiến độ thanh toán." },
]

const MOCK_DOCS: MockDocument[] = [
  { id: "doc-1", filename: "Hop_Dong_Dich_Vu_GreenPower_2026.pdf", status: "pending" },
  { id: "doc-2", filename: "NDA_Lawzy_Tech_Corp.docx", status: "pending" },
]

export function TabularReviewView() {
  const [columns, setColumns] = useState<MockColumn[]>(MOCK_COLUMNS)
  const [documents, setDocuments] = useState<MockDocument[]>(MOCK_DOCS)
  const [cells, setCells] = useState<MockCell[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAddColOpen, setIsAddColOpen] = useState(false)
  const [newColName, setNewColName] = useState("")
  const [newColDesc, setNewColDesc] = useState("")

  const handleAddColumn = () => {
    if (!newColName) return
    const newCol: MockColumn = {
      id: `col-${Date.now()}`,
      name: newColName,
      description: newColDesc
    }
    setColumns([...columns, newCol])
    setNewColName("")
    setNewColDesc("")
    setIsAddColOpen(false)
  }

  const handleGenerateCell = async (docId: string, colId: string) => {
    // Set cell to generating
    setCells(prev => {
      const filtered = prev.filter(c => !(c.documentId === docId && c.columnId === colId))
      return [...filtered, { documentId: docId, columnId: colId, content: null, status: "generating" }]
    })

    try {
      // MOCK: Gọi API route handler của Next.js (mock)
      const res = await fetch("/api/lpms/tabular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, columnId: colId, columnDef: columns.find(c => c.id === colId) })
      })
      const data = await res.json()
      
      setCells(prev => {
        const filtered = prev.filter(c => !(c.documentId === docId && c.columnId === colId))
        return [...filtered, { documentId: docId, columnId: colId, content: data.content, status: "done" }]
      })
    } catch (e) {
      setCells(prev => {
        const filtered = prev.filter(c => !(c.documentId === docId && c.columnId === colId))
        return [...filtered, { documentId: docId, columnId: colId, content: "Lỗi phân tích", status: "error" }]
      })
    }
  }

  const handleGenerateAll = async () => {
    setIsGenerating(true)
    
    // Khởi tạo trạng thái generating cho toàn bộ các ô chưa có dữ liệu
    const newCells = [...cells]
    const pendingTasks: {docId: string, colId: string}[] = []

    documents.forEach(doc => {
      columns.forEach(col => {
        const existing = cells.find(c => c.documentId === doc.id && c.columnId === col.id)
        if (!existing || existing.status !== "done") {
          pendingTasks.push({ docId: doc.id, colId: col.id })
          const idx = newCells.findIndex(c => c.documentId === doc.id && c.columnId === col.id)
          if (idx >= 0) newCells[idx] = { documentId: doc.id, columnId: col.id, content: null, status: "generating" }
          else newCells.push({ documentId: doc.id, columnId: col.id, content: null, status: "generating" })
        }
      })
    })

    setCells(newCells)

    // Chạy song song gọi API cho các ô
    await Promise.all(pendingTasks.map(task => handleGenerateCell(task.docId, task.colId)))
    setIsGenerating(false)
  }

  return (
    <div className="flex flex-col h-full gap-6 px-6 pb-6">
      <div className="flex items-center justify-between border-b pb-4 mt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bóc tách hợp đồng (Tabular Review)</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tự động trích xuất các điều khoản từ hàng loạt hợp đồng bằng AI, trình bày dưới dạng bảng so sánh.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Upload className="h-4 w-4 mr-2" />
            Upload Hợp đồng
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button 
            onClick={handleGenerateAll} 
            disabled={isGenerating || documents.length === 0 || columns.length === 0}
            className="bg-primary shadow-sm"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {isGenerating ? "Đang phân tích..." : "Phân tích tất cả"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Bảng Dữ Liệu
          <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{documents.length} File</span>
        </h2>
        
        <Dialog open={isAddColOpen} onOpenChange={setIsAddColOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="shadow-sm">
              <Plus className="h-4 w-4 mr-1" /> Thêm cột điều khoản
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Thêm cột bóc tách mới</DialogTitle>
              <DialogDescription>
                AI sẽ dựa vào mô tả của bạn để tìm kiếm và trích xuất thông tin tương ứng từ tất cả các hợp đồng.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên cột (Ngắn gọn)</Label>
                <Input 
                  id="name" 
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  placeholder="Ví dụ: Phạt vi phạm" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Prompt / Mô tả chi tiết cho AI</Label>
                <Input 
                  id="desc" 
                  value={newColDesc}
                  onChange={e => setNewColDesc(e.target.value)}
                  placeholder="Tìm các điều khoản quy định mức phạt khi vi phạm..." 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddColumn} disabled={!newColName}>Lưu & Thêm cột</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-0">
        <TRTable 
          columns={columns} 
          documents={documents} 
          cells={cells} 
          onGenerate={handleGenerateCell}
          isGlobalGenerating={isGenerating}
        />
      </div>
    </div>
  )
}
