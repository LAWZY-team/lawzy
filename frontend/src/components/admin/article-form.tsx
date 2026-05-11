"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api/client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArticleCanvasEditor } from "@/components/admin/article-canvas-editor"
import { slugify } from "@/lib/slugify"
import { useT } from "@/components/i18n-provider"
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

export interface ArticleFormData {
  type: string
  title: string
  slug: string
  excerpt: string
  contentText: string
  coverImage: string
  status: string
}

interface ArticleFormProps {
  article?: Article | null
  onSubmit: (data: ArticleFormData) => Promise<void>
  isPending?: boolean
  submitLabel?: string
  cancelHref?: string
  showCancel?: boolean
  actionsInHeader?: boolean
  formId?: string
}

function getContentForForm(a: Article | null | undefined): string {
  if (!a) return ""
  if (a.type === "policy" && a.content && typeof a.content === "object") {
    const c = a.content as Record<string, string>
    return c.vi ?? c.en ?? (a.contentText as string) ?? ""
  }
  return (a.contentText as string) ?? ""
}

export function ArticleForm({
  article,
  onSubmit,
  isPending = false,
  submitLabel,
  cancelHref,
  showCancel = true,
  actionsInHeader = false,
  formId = "article-form",
}: ArticleFormProps) {
  const { t } = useT()
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false)
  const [form, setForm] = useState<ArticleFormData>({
    type: article?.type ?? "news",
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    contentText: getContentForForm(article),
    coverImage: article?.coverImage ?? "",
    status: article?.status ?? "draft",
  })
  const slugLocked = !!article?.slug

  useEffect(() => {
    requestAnimationFrame(() => {
      setForm({
        type: article?.type ?? "news",
        title: article?.title ?? "",
        slug: article?.slug ?? "",
        excerpt: article?.excerpt ?? "",
        contentText: getContentForForm(article),
        coverImage: article?.coverImage ?? "",
        status: article?.status ?? "draft",
      })
    })
  }, [article])

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugLocked ? f.slug : slugify(title),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSubmit(form)
      toast.success(article ? t("admin_articles_saved") : t("admin_articles_created"))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleUploadCoverImage = async (file: File | null) => {
    if (!file) return
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const maxBytes = 5 * 1024 * 1024
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, GIF, WEBP files are allowed")
      return
    }
    if (file.size > maxBytes) {
      toast.error("Image size must be 5MB or less")
      return
    }
    try {
      setIsUploadingImage(true)
      const formData = new FormData()
      formData.append("file", file)
      const response = await api.upload<{ url: string }>("/articles/upload-image", formData)
      setForm((prev) => ({ ...prev, coverImage: response.url }))
      toast.success("Thumbnail uploaded")
    } catch (err) {
      toast.error((err as Error).message || t("editor_image_upload_failed"))
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-sm shrink-0">{t("admin_articles_type")}</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-sm shrink-0">{t("admin_articles_status")}</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
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
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("admin_articles_form_title")}</Label>
        <Input
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
          placeholder={t("admin_articles_form_title_placeholder")}
          className="text-base h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("admin_articles_form_excerpt")}</Label>
        <Textarea
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          rows={2}
          placeholder={t("admin_articles_form_excerpt_placeholder")}
          className="resize-none text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Thumbnail</Label>
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted/30">
          {form.coverImage ? (
            <img src={form.coverImage} alt="Article thumbnail" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              No thumbnail selected
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              void handleUploadCoverImage(file)
              e.currentTarget.value = ""
            }}
            disabled={isUploadingImage || isPending}
            className="max-w-xs"
          />
          {form.coverImage && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm((prev) => ({ ...prev, coverImage: "" }))}
              disabled={isUploadingImage || isPending}
            >
              {t("common_delete")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("admin_articles_form_content")}</Label>
        <ArticleCanvasEditor
          content={form.contentText}
          onChange={(html) => setForm((f) => ({ ...f, contentText: html }))}
          placeholder={t("admin_articles_form_content_placeholder")}
          minHeight="min-h-[400px]"
        />
      </div>

      {!actionsInHeader && (
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
          {showCancel && cancelHref && (
            <Button type="button" variant="outline" asChild>
              <a href={cancelHref}>{t("common_cancel")}</a>
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("common_loading") : submitLabel ?? (article ? t("common_save") : t("admin_articles_create"))}
          </Button>
        </div>
      )}
    </form>
  )
}
