"use client"

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
import { Skeleton } from "@/components/ui/skeleton"
import { useDocuments, useDeleteDocument } from "@/hooks/documents/use-documents"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useT } from "@/components/i18n-provider"

export default function DocumentsPage() {
  const { t } = useT()
  const { currentWorkspace } = useWorkspaceStore()

  const statusLabels: Record<string, string> = {
    draft: t("status_draft"),
    review: t("status_review"),
    approved: t("status_approved"),
    signed: t("status_signed"),
    completed: t("status_completed"),
    archived: t("status_archived"),
  }
  const workspaceId = currentWorkspace?.id ?? ""
  const { data, isLoading } = useDocuments(workspaceId, { limit: 50 })
  const deleteMutation = useDeleteDocument()

  const documents = data?.data ?? []

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
          <h2 className="text-3xl font-bold tracking-tight">{t("docs_my_documents")}</h2>
          <p className="text-muted-foreground">
            {t("docs_manage_all")}
          </p>
        </div>
        <Button asChild>
          <Link href="/editor/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("docs_create_new")}
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("recent_docs_name")}</TableHead>
              <TableHead>{t("recent_docs_type")}</TableHead>
              <TableHead>{t("recent_docs_status")}</TableHead>
              <TableHead>{t("recent_docs_updated")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                  {t("docs_empty")}
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Link href={`/editor/${doc.id}`} className="hover:underline">
                        {doc.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {statusLabels[doc.status] ?? doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(doc.updatedAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
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
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(doc.id)}
                        >
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
    </div>
  )
}
