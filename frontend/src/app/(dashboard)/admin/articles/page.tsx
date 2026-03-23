"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, FileText, MoreVertical, Plus, Pencil, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Skeleton } from "@/components/ui/skeleton"
import { getArticleUrl } from "@/lib/articles"
import { Modal } from "@/components/ui/modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { sanitizeHtml } from "@/lib/sanitize"
import { useAdminArticles, useDeleteArticle } from "@/hooks/articles/use-articles"
import { useT } from "@/components/i18n-provider"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import type { Article } from "@/hooks/articles/use-articles"

const TYPE_OPTIONS = [
  { value: "news", labelKey: "admin_articles_type_news" },
  { value: "policy", labelKey: "admin_articles_type_policy" },
  { value: "document", labelKey: "admin_articles_type_document" },
  { value: "announcement", labelKey: "admin_articles_type_announcement" },
] as const

const STATUS_OPTIONS = [
  { value: "draft", labelKey: "status_draft" },
  { value: "published", labelKey: "status_completed" },
  { value: "archived", labelKey: "status_archived" },
] as const

export default function AdminArticlesPage() {
  const { t } = useT()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const ALL_VALUE = "__all__"
  const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE)
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE)
  const [page, setPage] = useState(1)
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null)

  const { data, isLoading } = useAdminArticles({
    q: search || undefined,
    type: typeFilter === ALL_VALUE ? undefined : typeFilter || undefined,
    status: statusFilter === ALL_VALUE ? undefined : statusFilter || undefined,
    page,
    limit: 20,
  })
  const deleteMutation = useDeleteArticle()

  const articles = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(t("docs_deleted"))
      setDeleteTarget(null)
    } catch {
      toast.error(t("docs_delete_failed"))
    }
  }

  const statusLabels: Record<string, string> = {
    draft: t("status_draft"),
    published: t("status_completed"),
    archived: t("status_archived"),
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("admin_articles_title")}</h2>
          <p className="text-muted-foreground">{t("admin_articles_desc")}</p>
        </div>
        <Button asChild>
          <Link href="/admin/articles/add">
            <Plus className="mr-2 h-4 w-4" />
            {t("admin_articles_create")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t("admin_users_search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("admin_articles_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("admin_articles_type")}</SelectItem>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={t("admin_articles_status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("admin_articles_status")}</SelectItem>
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
              <TableHead>{t("recent_docs_name")}</TableHead>
              <TableHead>{t("admin_articles_type")}</TableHead>
              <TableHead>{t("admin_articles_status")}</TableHead>
              <TableHead>{t("admin_articles_published_at")}</TableHead>
              <TableHead>{t("recent_docs_updated")}</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                  {t("admin_articles_empty")}
                </TableCell>
              </TableRow>
            ) : (
              articles.map((art) => (
                <TableRow
                  key={art.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button, a")) return
                    setPreviewArticle(art)
                  }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{art.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {TYPE_OPTIONS.find((o) => o.value === art.type) && (
                      <span className="text-sm">{t(TYPE_OPTIONS.find((o) => o.value === art.type)!.labelKey)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {statusLabels[art.status] ?? art.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {art.publishedAt
                      ? formatDistanceToNow(new Date(art.publishedAt), { addSuffix: true, locale: vi })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(art.updatedAt), { addSuffix: true, locale: vi })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/articles/${art.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("admin_articles_edit")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={getArticleUrl(art.slug, art.type)} target="_blank">
                            {t("news_read_more")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(art)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common_delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination_page")} {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("admin_articles_delete_confirm_title")}
        desc={t("admin_articles_delete_confirm_desc")}
        cancelText={t("common_cancel")}
        confirmText={t("common_delete")}
        destructive
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      <ArticlePreviewModal
        article={previewArticle}
        open={!!previewArticle}
        onClose={() => setPreviewArticle(null)}
        onEdit={() => {
          if (previewArticle) router.push(`/admin/articles/${previewArticle.id}/edit`)
          setPreviewArticle(null)
        }}
      />
    </div>
  )
}

function ArticlePreviewModal({
  article,
  open,
  onClose,
  onEdit,
}: {
  article: Article | null
  open: boolean
  onClose: () => void
  onEdit: () => void
}) {
  const { t } = useT()
  if (!article) return null

  const getContentHtml = () => {
    if (article.type === "policy" && article.content && typeof article.content === "object") {
      const c = article.content as Record<string, string>
      return c.vi ?? c.en ?? article.contentText ?? ""
    }
    return article.contentText ?? ""
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      title={article.title}
    >
      <div className="flex flex-col h-full min-h-[400px] rounded-lg border-0 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
          <h3 className="font-semibold truncate pr-4">{article.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1.5" />
              {t("admin_articles_edit")}
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={getArticleUrl(article.slug, article.type)} target="_blank">
                {t("news_read_more")}
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common_close")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 w-full">
          <div className="flex-1 min-w-[max(360px,55%)] border-r flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b text-sm font-medium shrink-0">
              Nội dung
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6">
                <div
                  className="article-preview-prose prose prose-slate dark:prose-invert prose-lg max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b
                    prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3
                    prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2
                    prose-p:leading-relaxed prose-p:my-3
                    prose-ul:my-3 prose-ol:my-3 prose-li:my-1
                    [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      getContentHtml() || `<p class="text-muted-foreground">${t("admin_articles_preview_no_content")}</p>`,
                    ),
                  }}
                />
              </div>
            </ScrollArea>
          </div>

          <div className="flex shrink-0 w-[280px] flex-col bg-muted/20 overflow-hidden">
            <div className="px-3 py-2 border-b text-sm font-medium shrink-0">
              Thông tin bài viết
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                <div className="flex flex-col gap-2 text-sm">
                  <span className="text-muted-foreground">Loại</span>
                  <Badge variant="secondary">
                    {TYPE_OPTIONS.find((o) => o.value === article.type)?.labelKey
                      ? t(TYPE_OPTIONS.find((o) => o.value === article.type)!.labelKey)
                      : article.type}
                  </Badge>
                </div>
                <Separator />
                <div className="flex flex-col gap-2 text-sm">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <Badge variant={article.status === "published" ? "default" : "outline"}>
                    {article.status}
                  </Badge>
                </div>
                {article.slug && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">Slug</span>
                      <code className="text-xs break-all">/{article.slug}</code>
                    </div>
                  </>
                )}
                {article.excerpt && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">Tóm tắt</span>
                      <p className="text-xs line-clamp-4">{article.excerpt}</p>
                    </div>
                  </>
                )}
                {(article.publishedAt || article.updatedAt) && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      {article.publishedAt && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Xuất bản</span>
                          <span className="font-medium">
                            {new Date(article.publishedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {article.updatedAt && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Cập nhật</span>
                          <span className="font-medium">
                            {new Date(article.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </Modal>
  )
}
