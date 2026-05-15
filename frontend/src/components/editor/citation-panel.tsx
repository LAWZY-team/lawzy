"use client"

import { BookOpen, Scale } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useT } from "@/components/i18n-provider"
import type { SourceCitation, LawReference } from "@/lib/editor/contract-result"

interface CitationPanelProps {
  sourceCitations: SourceCitation[]
  lawReferences: LawReference[]
}

export const CitationPanel = ({ sourceCitations, lawReferences }: CitationPanelProps) => {
  const { t } = useT()
  const hasCitations = sourceCitations.length > 0 || lawReferences.length > 0

  if (!hasCitations) return null

  return (
    <div className="border-t pt-3 mt-3">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5" />
        {t("editor_citation_sources")}
      </h4>
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-2">
          {sourceCitations.map((citation, idx) => (
            <div
              key={`src-${idx}`}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs"
            >
              <Badge variant="outline" className="shrink-0 text-[10px] h-5 min-w-[20px] justify-center">
                {idx + 1}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {citation.sourceTitle || citation.fileName || t("editor_citation_source_fallback")}
                </p>
                {citation.articleNumber && (
                  <p className="text-muted-foreground">
                    {t("editor_citation_article", { n: citation.articleNumber })}
                  </p>
                )}
                {citation.pageNumber && (
                  <p className="text-muted-foreground">
                    {t("editor_citation_page", { n: citation.pageNumber })}
                  </p>
                )}
                {citation.excerpt && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 italic">
                    &ldquo;{citation.excerpt}&rdquo;
                  </p>
                )}
                {citation.usedInClause && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {citation.usedInClause}
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {lawReferences.length > 0 && (
            <>
              <h5 className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                {t("editor_citation_legal_basis")}
              </h5>
              {lawReferences.map((law, idx) => (
                <div
                  key={`law-${idx}`}
                  className="flex items-start gap-2 p-2 rounded-md bg-blue-50/50 dark:bg-blue-950/20 text-xs"
                >
                  <Scale className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {law.law}
                      {law.article ? ` – ${law.article}` : ""}
                    </p>
                    {law.text && (
                      <p className="text-muted-foreground mt-0.5">{law.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
