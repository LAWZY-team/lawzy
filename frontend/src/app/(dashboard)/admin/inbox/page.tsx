"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useT } from "@/components/i18n-provider"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useAdminInbox, useAdminInboxUpdateStatus } from "@/hooks/admin/use-admin-inbox"

const TYPE_OPTIONS = [
  { value: "sales_inquiry", labelKey: "admin_inbox_type_sales" },
  { value: "feedback", labelKey: "admin_inbox_type_feedback" },
  { value: "bug_report", labelKey: "admin_inbox_type_bug" },
  { value: "support_request", labelKey: "admin_inbox_type_support" },
] as const

const STATUS_OPTIONS = [
  { value: "pending", labelKey: "admin_inbox_status_pending" },
  { value: "processed", labelKey: "admin_inbox_status_processed" },
  { value: "archived", labelKey: "admin_inbox_status_archived" },
] as const

type Submission = {
  id: string
  type: string
  name: string
  email: string
  phone: string | null
  company: string | null
  title: string | null
  description: string
  status: string
  createdAt: string
}

export default function AdminInboxPage() {
  const { t } = useT()
  const ALL_VALUE = "__all__"
  const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE)
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Submission | null>(null)

  const { data, isLoading } = useAdminInbox({
    page,
    limit: 20,
    type: typeFilter !== ALL_VALUE ? typeFilter : undefined,
    status: statusFilter !== ALL_VALUE ? statusFilter : undefined,
  })
  const updateStatusMutation = useAdminInboxUpdateStatus()

  const submissions = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status })
      toast.success(t("admin_inbox_update_status"))
      if (selected?.id === id) setSelected({ ...selected, status })
    } catch {
      toast.error("Không thể cập nhật")
    }
  }

  const typeLabel = (type: string) => {
    const opt = TYPE_OPTIONS.find((o) => o.value === type)
    return opt ? t(opt.labelKey) : type
  }

  const statusLabel = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status)
    return opt ? t(opt.labelKey) : status
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("admin_inbox_title")}</h2>
        <p className="text-muted-foreground">{t("admin_inbox_desc")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("admin_inbox_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("admin_inbox_type")}</SelectItem>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("admin_inbox_status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("admin_inbox_status")}</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_inbox_type")}</TableHead>
              <TableHead>{t("admin_inbox_name")}</TableHead>
              <TableHead>{t("admin_inbox_email")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("admin_inbox_status")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin_inbox_created")}</TableHead>
              <TableHead className="w-[140px]">{t("admin_inbox_update_status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                </TableRow>
              ))
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {t("admin_inbox_empty")}
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(s)}
                >
                  <TableCell>
                    <Badge variant="secondary">{typeLabel(s.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={s.status === "pending" ? "default" : "outline"}>
                      {statusLabel(s.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true, locale: vi })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={s.status}
                      onValueChange={(v) => handleUpdateStatus(s.id, v)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("pagination_page")} {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("pagination_prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("pagination_next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title || selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">{t("admin_inbox_type")}: </span>
                  <Badge variant="secondary">{typeLabel(selected.type)}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("admin_inbox_status")}: </span>
                  <Badge variant={selected.status === "pending" ? "default" : "outline"}>
                    {statusLabel(selected.status)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("admin_inbox_name")}: </span>
                  {selected.name}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("admin_inbox_email")}: </span>
                  <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                    {selected.email}
                  </a>
                </div>
                {selected.phone && (
                  <div>
                    <span className="text-muted-foreground">{t("admin_inbox_phone")}: </span>
                    <a href={`tel:${selected.phone}`} className="text-primary hover:underline">
                      {selected.phone}
                    </a>
                  </div>
                )}
                {selected.company && (
                  <div>
                    <span className="text-muted-foreground">{t("admin_inbox_company")}: </span>
                    {selected.company}
                  </div>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">{t("admin_inbox_description")}:</span>
                <div className="rounded-md bg-muted p-3 whitespace-pre-wrap">{selected.description}</div>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("admin_inbox_created")}: {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
