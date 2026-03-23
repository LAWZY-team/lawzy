"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Monitor, Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { useT } from "@/components/i18n-provider"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { api } from "@/lib/api/client"

interface Session {
  id: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

async function fetchSessions(): Promise<Session[]> {
  const data = await api.get<Session[]>("/auth/sessions")
  return Array.isArray(data) ? data : (data as { sessions?: Session[] }).sessions ?? []
}

async function revokeSession(id: string): Promise<void> {
  await api.delete(`/auth/sessions/${id}`)
}

async function revokeOtherSessions(): Promise<{ count: number }> {
  return api.post("/auth/sessions/revoke-others")
}

export default function SettingsSessionsPage() {
  const { t } = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeOthersOpen, setRevokeOthersOpen] = useState(false)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: fetchSessions,
  })

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: (_, id) => {
      const session = sessions.find((s) => s.id === id)
      if (session?.isCurrent) {
        router.push("/login")
        return
      }
      queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] })
      toast.success(t("settings_sessions_revoked"))
      setRevokeId(null)
    },
    onError: () => {
      toast.error("Failed to revoke session")
    },
  })

  const revokeOthersMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] })
      toast.success(
        data?.count
          ? t("settings_sessions_revoked") + ` (${data.count})`
          : t("settings_sessions_revoked")
      )
      setRevokeOthersOpen(false)
    },
    onError: () => {
      toast.error("Failed to revoke sessions")
    },
  })

  const otherSessions = sessions.filter((s) => !s.isCurrent)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("settings_sessions")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings_sessions_desc")}
        </p>
      </div>
      <Separator />

      {sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("settings_sessions_empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {new Date(session.createdAt).toLocaleString()}
                    {session.isCurrent && (
                      <Badge variant="secondary" className="ml-2">
                        {t("settings_sessions_current")}
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings_sessions_expires")} {new Date(session.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRevokeId(session.id)}
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending && revokeId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="mr-1 h-4 w-4" />
                      {t("settings_sessions_revoke")}
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}

          {otherSessions.length > 0 && (
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => setRevokeOthersOpen(true)}
                disabled={revokeOthersMutation.isPending}
              >
                {revokeOthersMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {t("settings_sessions_revoke_others")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Revoke single session */}
      <AlertDialog open={!!revokeId} onOpenChange={(o) => !o && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings_sessions_revoke")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings_sessions_revoke_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>
              {t("common_cancel")}
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                if (revokeId) revokeMutation.mutate(revokeId)
              }}
            >
              {t("settings_sessions_revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke others */}
      <AlertDialog open={revokeOthersOpen} onOpenChange={setRevokeOthersOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings_sessions_revoke_others")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings_sessions_revoke_others_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRevokeOthersOpen(false)}>
              {t("common_cancel")}
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                revokeOthersMutation.mutate()
              }}
            >
              {t("settings_sessions_revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
