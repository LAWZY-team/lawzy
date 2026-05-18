"use client"

import { useRouter } from "next/navigation"
import { ArticleEditLayout } from "@/components/admin/article-edit-layout"
import { ArticleForm } from "@/components/admin/article-form"
import { useCreateArticle } from "@/hooks/articles/use-articles"
import { useT } from "@/components/i18n-provider"
import type { ArticleFormData } from "@/components/admin/article-form"

export default function AdminArticleAddPage() {
  const { t } = useT()
  const router = useRouter()
  const createMutation = useCreateArticle()

  const handleSubmit = async (form: ArticleFormData) => {
    const basePayload: any = { ...form }
    if (form.type === "policy") {
      basePayload.content = { vi: form.contentText }
    }
    
    basePayload.metadata = {
      ...(basePayload.metadata || {}),
      coverImageAlt: form.coverImageAlt || "",
      originalCoverImage: form.originalCoverImage || "",
    }
    
    await createMutation.mutateAsync({
      ...basePayload,
      title: form.title,
    })
    router.push("/admin/articles")
  }

  return (
    <ArticleEditLayout
      title={t("admin_articles_create")}
      subtitle={t("admin_articles_desc")}
      formId="article-form"
      saveLabel={t("admin_articles_create")}
      isPending={createMutation.isPending}
      cancelHref="/admin/articles"
      showCancel={true}
    >
      <ArticleForm
        onSubmit={handleSubmit}
        isPending={createMutation.isPending}
        submitLabel={t("admin_articles_create")}
        cancelHref="/admin/articles"
        showCancel={true}
        actionsInHeader={true}
        formId="article-form"
      />
    </ArticleEditLayout>
  )
}
