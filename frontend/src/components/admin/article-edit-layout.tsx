"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"

interface ArticleEditLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  formId?: string
  saveLabel?: string
  isPending?: boolean
  cancelHref?: string
  showCancel?: boolean
  className?: string
}

export function ArticleEditLayout({
  title,
  subtitle,
  children,
  formId,
  saveLabel = "Lưu",
  isPending = false,
  cancelHref = "/admin/articles",
  showCancel = true,
  className,
}: ArticleEditLayoutProps) {
  const { t } = useT()
  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-h-0 bg-background",
        className
      )}
    >
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={cancelHref}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showCancel && cancelHref && (
            <Button variant="outline" size="sm" asChild>
              <Link href={cancelHref}>{t("common_cancel")}</Link>
            </Button>
          )}
          {formId && (
            <Button type="submit" form={formId} disabled={isPending} size="sm">
              {isPending ? t("common_loading") : saveLabel}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-4 px-4">{children}</div>
      </main>
    </div>
  )
}
