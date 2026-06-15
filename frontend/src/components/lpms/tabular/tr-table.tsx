"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Play, FileText, CheckCircle2, Loader2, Info } from "lucide-react"

export type MockColumn = {
  id: string
  name: string
  description: string
}

export type MockDocument = {
  id: string
  filename: string
  status: "pending" | "processing" | "done"
}

export type MockCell = {
  documentId: string
  columnId: string
  content: string | null
  status: "pending" | "generating" | "done" | "error"
}

interface TRTableProps {
  columns: MockColumn[]
  documents: MockDocument[]
  cells: MockCell[]
  onGenerate: (docId: string, colId: string) => void
  isGlobalGenerating: boolean
}

export function TRTable({
  columns,
  documents,
  cells,
  onGenerate,
  isGlobalGenerating
}: TRTableProps) {
  return (
    <div className="rounded-md border bg-white shadow-sm overflow-auto max-h-[70vh]">
      <Table>
        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
          <TableRow>
            <TableHead className="w-[250px] font-semibold border-r">Tài liệu</TableHead>
            {columns.map((col) => (
              <TableHead key={col.id} className="min-w-[200px] border-r">
                <div className="flex flex-col gap-1 py-2">
                  <span className="font-semibold text-foreground">{col.name}</span>
                  <span className="text-xs text-muted-foreground font-normal line-clamp-2" title={col.description}>
                    {col.description}
                  </span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} className="hover:bg-slate-50/50">
              <TableCell className="font-medium border-r bg-white align-top p-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span className="break-all line-clamp-3">{doc.filename}</span>
                </div>
              </TableCell>
              {columns.map((col) => {
                const cell = cells.find(c => c.documentId === doc.id && c.columnId === col.id)
                return (
                  <TableCell key={`${doc.id}-${col.id}`} className="border-r align-top p-0 relative group">
                    <div className="p-4 min-h-[100px] h-full flex flex-col">
                      {cell?.status === "generating" ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs">Đang xử lý AI...</span>
                        </div>
                      ) : cell?.status === "done" ? (
                        <div className="text-sm prose prose-sm dark:prose-invert">
                          {cell.content}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs"
                            disabled={isGlobalGenerating}
                            onClick={() => onGenerate(doc.id, col.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Phân tích ô này
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground/50" />
                  <p>Chưa có tài liệu nào. Hãy upload hợp đồng để bắt đầu bóc tách.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
