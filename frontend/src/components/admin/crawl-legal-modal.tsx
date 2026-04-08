"use client"

import { useState, useEffect, useRef } from "react"
import { Globe, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/ui/modal"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useT } from "@/components/i18n-provider"
import { useLegalCrawler } from "@/hooks/admin/use-legal-crawler"

const FIELD_OPTIONS = [
  { id: 7, name: "Dân sự" },
  { id: 11, name: "Doanh nghiệp" },
  { id: 3, name: "Lao động-Tiền lương" },
  { id: 4, name: "Thuế-Phí-Lệ phí" },
  { id: 28, name: "Giao thông" },
  { id: 1, name: "Đất đai-Nhà ở" },
  { id: 25, name: "Chính sách" },
  { id: 5, name: "Thương mại-Quảng cáo" },
  { id: 6, name: "Bảo hiểm" },
  { id: 2, name: "Hình sự" },
  { id: 9, name: "Hành chính" },
  { id: 10, name: "Giáo dục-Đào tạo" },
] as const

const DOC_TYPE_OPTIONS = [
  { id: 10, name: "Luật" },
  { id: 13, name: "Nghị quyết" },
  { id: 14, name: "Nghị định" },
  { id: 21, name: "Thông tư" },
  { id: 18, name: "Quyết định" },
  { id: 12, name: "Chỉ thị" },
  { id: 22, name: "Pháp lệnh" },
  { id: 16, name: "Lệnh" },
] as const

const MAX_CRAWL_PAGE_SPAN = 500

interface CrawlLegalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCrawlComplete?: () => void
}

export const CrawlLegalModal = ({
  open,
  onOpenChange,
  onCrawlComplete,
}: CrawlLegalModalProps) => {
  const { t } = useT()
  const { startCrawl, job, starting, reset } = useLegalCrawler()

  const [pageFrom, setPageFrom] = useState(1)
  const [pageTo, setPageTo] = useState(5)
  const [selectedFields, setSelectedFields] = useState<number[]>([])
  const [selectedDocTypes, setSelectedDocTypes] = useState<number[]>([])

  const toggleField = (id: number) => {
    setSelectedFields((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    )
  }

  const toggleDocType = (id: number) => {
    setSelectedDocTypes((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    )
  }

  const crawlOpenRef = useRef(false)
  useEffect(() => {
    if (!open) {
      crawlOpenRef.current = false
      return
    }
    if (crawlOpenRef.current) return
    crawlOpenRef.current = true
    const id = requestAnimationFrame(() => {
      setPageFrom(1)
      setPageTo(5)
      setSelectedFields([])
      setSelectedDocTypes([])
      reset()
    })
    return () => cancelAnimationFrame(id)
  }, [open, reset])

  const handleStart = async () => {
    const from = Math.max(
      1,
      Number.isFinite(Number(pageFrom)) ? Math.floor(Number(pageFrom)) : 1,
    )
    let to = Number.isFinite(Number(pageTo)) ? Math.floor(Number(pageTo)) : from
    if (to < from) to = from
    if (to - from > MAX_CRAWL_PAGE_SPAN) {
      toast.error(`Tối đa ${MAX_CRAWL_PAGE_SPAN} trang mỗi lần crawl`)
      return
    }
    try {
      await startCrawl({
        pageFrom: from,
        pageTo: to,
        fieldIds: selectedFields.length > 0 ? selectedFields : undefined,
        docTypeIds: selectedDocTypes.length > 0 ? selectedDocTypes : undefined,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể bắt đầu crawl")
    }
  }

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      if (job?.status === "completed") {
        onCrawlComplete?.()
      }
      reset()
    }
    onOpenChange(next)
  }

  const handleCloseClick = () => {
    handleDialogOpenChange(false)
  }

  const isRunning = job?.status === 'running'
  const isCompleted = job?.status === 'completed'
  const isFailed = job?.status === 'failed'
  const progress = job && job.total > 0
    ? Math.round((job.processed / job.total) * 100)
    : 0

  return (
    <Modal
      open={open}
      onOpenChange={isRunning ? undefined : handleDialogOpenChange}
      title={t("crawl_title")}
      description={t("crawl_desc")}
      size="md"
      preventClose={isRunning}
    >
      <div className="flex flex-col gap-5 p-1">
        {!job ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("crawl_page_from")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={pageFrom}
                  onChange={(e) => {
                    const v = Math.max(1, Math.floor(Number(e.target.value)) || 1)
                    setPageFrom(v)
                    setPageTo((prev) => (prev < v ? v : prev))
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("crawl_page_to")}</Label>
                <Input
                  type="number"
                  min={pageFrom}
                  value={pageTo}
                  onChange={(e) => {
                    const raw = Number(e.target.value)
                    const v = Number.isFinite(raw)
                      ? Math.max(pageFrom, Math.floor(raw))
                      : pageFrom
                    setPageTo(v)
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("crawl_field_filter")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {FIELD_OPTIONS.map((f) => (
                  <Badge
                    key={f.id}
                    variant={selectedFields.includes(f.id) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleField(f.id)}
                  >
                    {f.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Không chọn = tất cả lĩnh vực
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("crawl_doc_type_filter")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DOC_TYPE_OPTIONS.map((d) => (
                  <Badge
                    key={d.id}
                    variant={selectedDocTypes.includes(d.id) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleDocType(d.id)}
                  >
                    {d.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Không chọn = tất cả loại văn bản
              </p>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Mỗi trang chứa 20 văn bản. Crawl {pageTo - pageFrom + 1} trang = tối đa{" "}
                <strong>{(pageTo - pageFrom + 1) * 20}</strong> văn bản.
                Quá trình có thể mất vài phút.
              </span>
            </div>

            <Button onClick={handleStart} disabled={starting} className="w-full">
              {starting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              {t("crawl_start")}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {isRunning && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
              {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {isFailed && <XCircle className="h-5 w-5 text-red-500" />}
              <span className="font-medium">
                {isRunning && t("crawl_status_running")}
                {isCompleted && t("crawl_status_completed")}
                {isFailed && t("crawl_status_failed")}
              </span>
            </div>

            <Progress value={progress} className="h-3" />

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("crawl_progress_total")}</span>
                <span className="font-mono">{job.processed}/{job.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("crawl_progress_created")}</span>
                <span className="font-mono text-green-600">{job.created}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("crawl_progress_skipped")}</span>
                <span className="font-mono text-yellow-600">{job.skipped}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("crawl_progress_errors")}</span>
                <span className="font-mono text-red-600">{job.errors.length}</span>
              </div>
            </div>

            {job.currentDoc && isRunning && (
              <div className="text-xs text-muted-foreground truncate">
                {t("crawl_current_doc")}: {job.currentDoc}
              </div>
            )}

            {job.errors.length > 0 && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-destructive">
                  {t("crawl_progress_errors")} ({job.errors.length})
                </Label>
                <ScrollArea className="h-24 rounded border bg-muted/30 p-2">
                  {job.errors.map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-mono">
                      {err}
                    </p>
                  ))}
                </ScrollArea>
              </div>
            )}

            {!isRunning && (
              <Button onClick={handleCloseClick} variant="outline" className="w-full">
                {t("crawl_close")}
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
