"use client"

import { useEffect, useState, useMemo } from "react"
import type { AdminSource } from "@/hooks/admin/use-admin-sources"
import { useAdminSourceChunks } from "@/hooks/admin/use-admin-sources"
import {
  useWorkspaceSourceChunks,
  useWorkspaceSourceDetail,
  type WorkspaceSourceChunk,
} from "@/hooks/sources/use-sources"
import { useT } from "@/components/i18n-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatBytes,
  formatExtractedContentForPreview,
} from "@/lib/sources/source-detail-format"
import { SOURCE_ROW_STATUS_BADGE } from "@/lib/sources/source-row-status"

type SourceDetailModalAdminProps = {
  mode: "admin"
  open: boolean
  onOpenChange: (open: boolean) => void
  source: AdminSource | null
}

type SourceDetailModalMemberProps = {
  mode: "member"
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceId: string | null
}

export type SourceDetailModalProps = SourceDetailModalAdminProps | SourceDetailModalMemberProps

type ChunksPanelProps = {
  loading: boolean
  isError: boolean
  chunks: WorkspaceSourceChunk[] | undefined
}

const ChunksPanel = ({ loading, isError, chunks }: ChunksPanelProps) => {
  const { t } = useT()
  if (loading) {
    return (
      <>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </>
    )
  }
  if (isError) {
    return <p className="text-destructive text-sm px-1">{t("sources_workspace_chunks_error")}</p>
  }
  if (!chunks?.length) {
    return <p className="text-muted-foreground text-sm px-1">{t("sources_workspace_chunks_empty")}</p>
  }
  return chunks.map((ch, i) => (
    <div key={ch.id} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono font-medium text-foreground">#{i + 1}</span>
        <span>
          {t("sources_workspace_chunk_page")}: {ch.pageNumber != null ? ch.pageNumber : "—"}
        </span>
        <span>
          {t("sources_workspace_chunk_tokens")}: {ch.tokenCount}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words leading-relaxed text-pretty">{ch.content}</p>
    </div>
  ))
}

/**
 * Unified source detail: extracted content + chunks tab.
 * - **admin**: inline data from list (Lawzy/system sources).
 * - **member**: loads `GET /sources/:id` and workspace-scoped chunks.
 */
export const SourceDetailModal = (props: SourceDetailModalProps) => {
  const { t } = useT()
  const [tab, setTab] = useState<"content" | "chunks">("content")
  const isAdmin = props.mode === "admin"
  const adminSource = isAdmin ? props.source : null
  const memberId = !isAdmin ? props.sourceId : null
  const memberOpen = props.open && props.mode === "member"
  const adminOpen = props.open && props.mode === "admin"
  const sourceScopeKey = useMemo(
    () => (isAdmin ? adminSource?.id ?? "" : memberId ?? ""),
    [isAdmin, adminSource?.id, memberId],
  )
  useEffect(() => {
    const id = requestAnimationFrame(() => setTab("content"))
    return () => cancelAnimationFrame(id)
  }, [sourceScopeKey])
  const memberDetailQuery = useWorkspaceSourceDetail(memberId, memberOpen)
  const memberChunksQuery = useWorkspaceSourceChunks(
    memberId,
    memberOpen && tab === "chunks",
  )
  const adminChunksQuery = useAdminSourceChunks(
    adminSource?.id ?? null,
    adminOpen && tab === "chunks",
  )
  const show =
    props.open &&
    (isAdmin ? adminSource != null : memberId != null)
  const displaySource = isAdmin ? adminSource : memberDetailQuery.data
  const isLoadingMember = !isAdmin && memberDetailQuery.isLoading
  const isErrorMember = !isAdmin && memberDetailQuery.isError && !memberDetailQuery.isLoading
  const chunksLoading = isAdmin ? adminChunksQuery.isLoading : memberChunksQuery.isLoading
  const chunksError = isAdmin ? adminChunksQuery.isError : memberChunksQuery.isError
  const chunksList = isAdmin ? adminChunksQuery.data?.chunks : memberChunksQuery.data?.chunks
  const a11yKey = isAdmin ? "admin_sources_detail_a11y" : "sources_workspace_detail_a11y"
  return (
    <Dialog open={show} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,800px)] w-[calc(100%-2rem)] max-w-3xl min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {isLoadingMember ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : displaySource ? (
          <>
            <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
              <DialogTitle className="pr-8 leading-snug">{displaySource.title}</DialogTitle>
              <DialogDescription className="sr-only">{t(a11yKey)}</DialogDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline" className="text-xs">
                  {displaySource.type}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {displaySource.scope ?? "workspace"}
                </Badge>
                {(() => {
                  const b =
                    SOURCE_ROW_STATUS_BADGE[displaySource.status] ??
                    SOURCE_ROW_STATUS_BADGE.pending
                  return (
                    <Badge variant={b.variant} className="text-xs">
                      {b.label}
                    </Badge>
                  )
                })()}
              </div>
            </DialogHeader>
            <div className="grid shrink-0 gap-2 border-b bg-muted/30 px-6 py-3 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  <span className="text-muted-foreground">{t("admin_sources_detail_chunks")}: </span>
                  <span className="font-medium tabular-nums">
                    {displaySource.chunkCount != null ? displaySource.chunkCount : "—"}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">{t("admin_sources_detail_pages")}: </span>
                  <span className="font-medium tabular-nums">
                    {displaySource.pageCount != null ? displaySource.pageCount : "—"}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">{t("admin_sources_detail_size")}: </span>
                  <span className="font-medium">{formatBytes(displaySource.size ?? 0)}</span>
                </span>
              </div>
              {displaySource.user?.name && (
                <p className="text-muted-foreground text-xs">
                  {t("admin_sources_detail_owner")}: {displaySource.user.name}
                </p>
              )}
              {isAdmin && adminSource?.workspace?.name && (
                <p className="text-muted-foreground text-xs">
                  {t("admin_sources_detail_workspace")}: {adminSource.workspace.name}
                </p>
              )}
              {displaySource.processingError && (
                <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-md border px-2 py-1.5 text-xs leading-relaxed">
                  <span className="font-medium">{t("admin_sources_detail_error")}: </span>
                  {displaySource.processingError}
                </p>
              )}
            </div>
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "content" | "chunks")}
              className="flex min-h-0 min-w-0 flex-1 flex-col px-6 pt-3 pb-4"
            >
              <TabsList className="mb-3 w-full justify-start sm:w-auto">
                <TabsTrigger value="content">{t("sources_workspace_detail_tab_content")}</TabsTrigger>
                <TabsTrigger value="chunks">{t("sources_workspace_detail_tab_chunks")}</TabsTrigger>
              </TabsList>
              <TabsContent
                value="content"
                className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
              >
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  {t("admin_sources_detail_content")}
                </p>
                <ScrollArea className="h-[min(50vh,420px)] w-full min-w-0 rounded-md border">
                  <div className="text-foreground w-full min-w-0 max-w-full break-words p-4 text-sm leading-relaxed text-pretty">
                    {displaySource.content?.trim() ? (
                      <p className="whitespace-pre-line">
                        {formatExtractedContentForPreview(displaySource.content)}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">{t("admin_sources_detail_no_content")}</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent
                value="chunks"
                className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
              >
                <ScrollArea className="h-[min(50vh,420px)] w-full min-w-0 rounded-md border">
                  <div className="flex flex-col gap-3 p-3">
                    <ChunksPanel loading={chunksLoading} isError={chunksError} chunks={chunksList} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        ) : isErrorMember ? (
          <div className="p-6 text-destructive text-sm">{t("sources_workspace_detail_load_error")}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
