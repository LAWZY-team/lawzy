"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArticleEditLayout } from "@/components/admin/article-edit-layout"
import { ArticleForm } from "@/components/admin/article-form"
import { useArticle, useUpdateArticle } from "@/hooks/articles/use-articles"
import { useT } from "@/components/i18n-provider"
import type { ArticleFormData } from "@/components/admin/article-form"

export default function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { t } = useT()
  const router = useRouter()
  const resolvedParams = use(params)
  const { id } = resolvedParams

  const { data: article, isLoading, error } = useArticle(id)
  const updateMutation = useUpdateArticle()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isLoading && !article && !error) requestAnimationFrame(() => setNotFound(true))
    if (error) requestAnimationFrame(() => setNotFound(true))
  }, [isLoading, article, error])

  const handleSubmit = async (form: ArticleFormData) => {
    const basePayload: any = { ...form }
    if (article?.type === "policy" || form.type === "policy") {
      const prevContent =
        typeof article?.content === "object" && article?.content !== null
          ? (article.content as Record<string, string>)
          : {}
      basePayload.content = {
        ...prevContent,
        vi: form.contentText,
      }
    }
    
    basePayload.metadata = {
      ...(typeof article?.metadata === 'object' ? article.metadata : {}),
      coverImageAlt: form.coverImageAlt || "",
      originalCoverImage: form.originalCoverImage || "",
    }

    await updateMutation.mutateAsync({
      id,
      ...basePayload,
    })
    router.push("/admin/articles")
  }

  if (isLoading || !article) {
    return (
      <ArticleEditLayout title={t("admin_articles_edit")}>
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          {isLoading ? t("common_loading") : notFound ? t("news_not_found") : "—"}
        </div>
      </ArticleEditLayout>
    )
  }

  return (
    <ArticleEditLayout
      title={t("admin_articles_edit")}
      subtitle={article.title}
      formId="article-form"
      saveLabel={t("common_save")}
      isPending={updateMutation.isPending}
      cancelHref="/admin/articles"
      showCancel={true}
    >
      <ArticleForm
        article={article}
        onSubmit={handleSubmit}
        isPending={updateMutation.isPending}
        submitLabel={t("common_save")}
        cancelHref="/admin/articles"
        showCancel={true}
        actionsInHeader={true}
        formId="article-form"
      />
    </ArticleEditLayout>
  )
}
