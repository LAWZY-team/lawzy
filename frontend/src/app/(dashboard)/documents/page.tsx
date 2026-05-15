"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { FileText, MoreVertical, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocuments, useSharedDocuments, useDeleteDocument } from "@/hooks/documents/use-documents"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useGuestEditorSessionStore } from "@/stores/guest-editor-session-store"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useT } from "@/components/i18n-provider"

const STATUS_KEYS = [
  "draft",
  "review",
  "approved",
  "signed",
  "completed",
  "archived",
] as const

function formatDate(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi })
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}

function DocumentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") === "shared" ? "shared" : "mine"
  const { t } = useT()
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace)
  const { clearSession } = useGuestEditorSessionStore()
  const deleteMutation = useDeleteDocument()

  const { data: mineData, isLoading: mineLoading } = useDocuments(
    currentWorkspace?.id,
    { limit: 50 }
  )
  const { data: sharedData, isLoading: sharedLoading } = useSharedDocuments(
    currentWorkspace?.id,
    { limit: 50 }
  )

  const mineDocs = mineData?.data ?? []
  const sharedDocs = sharedData?.data ?? []
  const statusLabels = Object.fromEntries(
    STATUS_KEYS.map((k) => [k, t(`status_${k}`)])
  )

  const setTab = (tab: "mine" | "shared") => {
    router.replace(tab === "mine" ? "/documents" : "/documents?tab=shared")
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(t("docs_deleted"))
    } catch {
      toast.error(t("docs_delete_failed"))
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("sidebar_documents")}
          </h2>
          <p className="text-muted-foreground">{t("docs_manage_all")}</p>
        </div>
        <Button
          id="tour-documents-create"
          onClick={() => {
            clearSession()
            router.push("/editor/new")
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("docs_create_new")}
        </Button>
      </div>
    
      <Tabs value={activeTab} onValueChange={(v) => setTab(v as "mine" | "shared")} className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="mine">{t("sidebar_documents_mine")}</TabsTrigger>
          <TabsTrigger value="shared">{t("sidebar_documents_shared")}</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-0 flex-1 min-h-0">
          <div className="rounded-md border bg-card h-[calc(100vh-220px)] overflow-auto relative scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead>{t("recent_docs_name")}</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>{t("recent_docs_status")}</TableHead>
                  <TableHead>{t("recent_docs_updated")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mineLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : mineDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("docs_empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  mineDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <Link href={`/editor/${doc.id}`} className="flex items-center gap-2 hover:underline">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {doc.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatBytes(doc.documentSizeBytes ?? 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {statusLabels[doc.status] ?? doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(doc.updatedAt)}
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
                              <Link href={`/editor/${doc.id}`}>{t("recent_docs_open")}</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>{t("recent_docs_share")}</DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/files?documentId=${encodeURIComponent(doc.id)}&category=export_output`}>
                                Xem file xuất
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(doc.id)}>
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
        </TabsContent>

        <TabsContent value="shared" className="mt-0 flex-1 min-h-0">
          <div className="rounded-md border bg-card h-[calc(100vh-220px)] overflow-auto relative scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead>{t("recent_docs_name")}</TableHead>
                  <TableHead>{t("docs_shared_creator")}</TableHead>
                  <TableHead>{t("docs_shared_workspace")}</TableHead>
                  <TableHead>{t("recent_docs_status")}</TableHead>
                  <TableHead>{t("recent_docs_updated")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : sharedDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {t("docs_shared_empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sharedDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <Link href={`/editor/${doc.id}`} className="flex items-center gap-2 hover:underline">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {doc.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.creator?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.workspace?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {statusLabels[doc.status] ?? doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(doc.updatedAt)}
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
                              <Link href={`/editor/${doc.id}`}>{t("recent_docs_open")}</Link>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-6"><Skeleton className="h-8 w-48" /></div>}>
      <DocumentsContent />
    </Suspense>
  )
}
