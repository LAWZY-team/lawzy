"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Folder, 
  Plus, 
  Search, 
  FolderOpen, 
  ArrowRight, 
  Loader2, 
  X,
  FileText,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { api } from "@/lib/api/client"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { motion, AnimatePresence } from "framer-motion"
import { useT } from "@/components/i18n-provider"

interface ProjectListItem {
  id: string
  name: string
  code: string
  description: string | null
  createdAt: string
  _count?: {
    documents: number
  }
}

export default function ProjectsPage() {
  const { t } = useT()
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace)
  const workspaceId = currentWorkspace?.id

  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Create Project modal states
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [projName, setProjName] = useState("")
  const [projCode, setProjCode] = useState("")
  const [projDesc, setProjDesc] = useState("")

  const fetchProjects = async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const data = await api.get<ProjectListItem[]>(`/projects?workspaceId=${workspaceId}`)
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to load projects", err)
      toast.error(t("proj_load_failed"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [workspaceId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return
    if (!projName.trim() || !projCode.trim()) {
      toast.error(t("proj_form_validation"))
      return
    }

    setIsCreating(true)
    try {
      const formattedCode = projCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "")
      await api.post("/clm/projects", {
        name: projName.trim(),
        code: formattedCode,
        description: projDesc.trim() || undefined,
        workspaceId,
      })
      toast.success(t("proj_create_success"))
      setIsOpen(false)
      // Reset form
      setProjName("")
      setProjCode("")
      setProjDesc("")
      // Refresh list
      fetchProjects()
    } catch (err: any) {
      console.error("Failed to create project", err)
      const errMsg = err?.message || t("proj_create_failed")
      toast.error(errMsg)
    } finally {
      setIsCreating(false)
    }
  }

  // Filter projects by search query
  const filteredProjects = projects.filter((p) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    )
  })

  return (
    <div className="flex-1 bg-gradient-to-b from-background via-muted/5 to-background text-foreground min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">{t("proj_title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("proj_subtitle")}
            </p>
          </div>

          <Button 
            onClick={() => setIsOpen(true)}
            className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-sm self-start md:self-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("proj_btn_create")}
          </Button>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center w-full max-w-md relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("proj_search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-card/40 border-border/80 rounded-xl"
          />
        </div>

        {/* Main Grid Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card/30 border-border/60">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-card/10 max-w-2xl mx-auto">
            <div className="p-4 rounded-full bg-muted/40 text-muted-foreground mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-lg">{t("proj_not_found")}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              {searchQuery 
                ? t("proj_search_empty_desc")
                : t("proj_empty_desc")}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsOpen(true)} variant="outline" className="mt-5 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                {t("proj_btn_create_first")}
              </Button>
            )}
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group bg-card/30 hover:bg-card/50 border-border/60 hover:border-muted-foreground/30 shadow-sm hover:shadow transition-all duration-300 h-full flex flex-col justify-between overflow-hidden relative">
                  
                  {/* Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-border/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <CardHeader className="space-y-2.5 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="bg-orange-500/5 text-orange-600 dark:text-orange-400 border-orange-500/20 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        {project.code}
                      </Badge>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{t("proj_doc_count", { n: project._count?.documents ?? 0 })}</span>
                      </div>
                    </div>

                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors truncate">
                      {project.name}
                    </CardTitle>

                    <CardDescription className="line-clamp-2 text-xs leading-relaxed min-h-[32px]">
                      {project.description || t("proj_no_desc")}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 pb-5">
                    <Button 
                      asChild 
                      variant="ghost" 
                      className="w-full text-xs font-semibold hover:bg-muted justify-between rounded-xl group-hover:text-primary border border-border/40"
                    >
                      <Link href={`/clm/projects/${project.id}`}>
                        <span>{t("proj_btn_view_details")}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>

      {/* Create Project Custom Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-lg rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/60">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">{t("proj_modal_title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("proj_modal_subtitle")}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">{t("proj_modal_field_name")}</label>
                  <Input 
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder={t("proj_modal_field_name_placeholder")}
                    required
                    disabled={isCreating}
                    className="h-10 border-border/80 bg-background/50 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">{t("proj_modal_field_code")}</label>
                    <span className="text-[10px] text-muted-foreground">{t("proj_modal_field_code_hint")}</span>
                  </div>
                  <Input 
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    placeholder={t("proj_modal_field_code_placeholder")}
                    required
                    disabled={isCreating}
                    className="h-10 border-border/80 bg-background/50 font-mono text-sm uppercase rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">{t("proj_modal_field_desc")}</label>
                  <textarea
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    placeholder={t("proj_modal_field_desc_placeholder")}
                    disabled={isCreating}
                    rows={3}
                    className="w-full text-sm p-3 bg-background/50 border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 justify-end pt-4 border-t border-border/60 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                    disabled={isCreating}
                    className="rounded-xl h-10 px-4"
                  >
                    {t("common_cancel")}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 rounded-xl h-10 px-5"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("proj_modal_btn_creating")}
                      </>
                    ) : (
                      t("proj_modal_btn_submit")
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
