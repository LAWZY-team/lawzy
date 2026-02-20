"use client"

import Link from "next/link"
import { FileText, MoreVertical } from "lucide-react"
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
import { useRecentDocuments } from "@/hooks/dashboard/use-dashboard"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { useT } from "@/components/i18n-provider"

const statusKeys: Record<string, string> = {
  draft: "status_draft",
  review: "status_review",
  approved: "status_approved",
  signed: "status_signed",
  completed: "status_completed",
  archived: "status_archived",
}

export function RecentDocs() {
  const { data: recentDocs, isLoading } = useRecentDocuments(5)
  const { t } = useT()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("recent_docs_title")}</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/documents">{t("recent_docs_view_all")}</Link>
        </Button>
      </div>

      <div className="rounded-md border">
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
            ) : !recentDocs?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("recent_docs_empty")}
                </TableCell>
              </TableRow>
            ) : (
              recentDocs.map((doc) => (
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
                    <Badge variant="secondary">
                      {statusKeys[doc.status]
                        ? t(statusKeys[doc.status] as any)
                        : doc.status}
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
