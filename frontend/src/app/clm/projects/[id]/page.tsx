"use client"

import { useState, useEffect, use, useRef } from "react"
import { useT } from "@/components/i18n-provider"
import Link from "next/link"
import { 
  Folder, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeft,
  Activity,
  Layers,
  ArrowUpRight,
  Plus,
  Upload,
  X,
  Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { api } from "@/lib/api/client"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface ProjectDocument {
  id: string
  title: string
  type: string
  status: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  code: string
  description: string | null
  workspaceId: string
  createdAt: string
  updatedAt: string
  documents: ProjectDocument[]
}

interface MismatchAlert {
  id: string
  documentId: string
  fieldKey: string
  sourceValue: string
  mismatchValue: string
  severity: "high" | "medium" | "low"
  description: string
  status: "unresolved" | "resolved"
  createdAt: string
  document: {
    id: string
    title: string
    visibility: "private" | "workspace"
  }
}

interface TreeNode {
  document: ProjectDocument
  children: TreeNode[]
}

// Field labels localized dynamically

function buildTree(documents: ProjectDocument[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const doc of documents) {
    nodeMap.set(doc.id, { document: doc, children: [] })
  }

  for (const doc of documents) {
    const node = nodeMap.get(doc.id)!
    if (doc.parentId && nodeMap.has(doc.parentId)) {
      nodeMap.get(doc.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useT()

  const FIELD_LABELS: Record<string, string> = {
    capacity: t("proj_field_capacity"),
    location: t("proj_field_location"),
    developerName: t("proj_field_developer"),
    contractorName: t("proj_field_contractor"),
    projectName: t("proj_field_project_name"),
  }

  const resolvedParams = use(params)
  const projectId = resolvedParams.id

  const [project, setProject] = useState<Project | null>(null)
  const [alerts, setAlerts] = useState<MismatchAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      const [projData, alertsData] = await Promise.all([
        api.get<Project>(`/clm/projects/${projectId}`),
        api.get<MismatchAlert[]>(`/clm/projects/${projectId}/mismatch-alerts`),
      ])
      setProject(projData)
      setAlerts(alertsData)
    } catch (err) {
      console.error("Failed to load project details", err)
      toast.error(t("proj_detail_load_failed"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleValidate = async () => {
    setIsScanning(true)
    const toastId = toast.loading(t("proj_scanning_toast"))
    try {
      await api.post(`/clm/projects/${projectId}/validate-consistency`)
      toast.success(t("proj_scan_success"), { id: toastId })
      await fetchData()
    } catch (err) {
      console.error("Scan error", err)
      toast.error(t("proj_scan_failed"), { id: toastId })
    } finally {
      setIsScanning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8 max-w-7xl mx-auto w-full">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 gap-4">
        <Folder className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-bold">{t("proj_not_found")}</h2>
        <p className="text-muted-foreground">{t("proj_not_found_desc")}</p>
        <Button asChild>
          <Link href="/dashboard">{t("proj_back_overview")}</Link>
        </Button>
      </div>
    )
  }

  const documentTree = buildTree(project.documents)

  // Sub-component to render the tree nodes recursively
  const TreeNodeComponent = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => {
    const { document: doc, children } = node
    
    return (
      <div className="flex flex-col">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: depth * 0.05 }}
          className="group flex items-center justify-between p-4 my-1 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/30 hover:border-muted-foreground/30 transition-all duration-300 relative overflow-hidden"
          style={{ marginLeft: `${depth * 28}px` }}
        >
          {depth > 0 && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-border/80 via-border/40 to-transparent" 
              style={{ left: `-${14}px` }} 
            />
          )}

          <div className="flex items-center gap-3">
            {doc.type === "contract" ? (
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400">
                <FileText className="h-4 w-4" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 dark:bg-orange-950/40 dark:text-orange-400">
                <Layers className="h-4 w-4" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-card-foreground group-hover:text-primary transition-colors">
                  {doc.title}
                </span>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {doc.type === "contract" ? t("proj_doc_type_contract") : t("proj_doc_type_addendum")}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("recent_docs_updated")}: {new Date(doc.updatedAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge 
              variant={doc.status === "completed" || doc.status === "signed" ? "default" : "secondary"}
              className="text-xs"
            >
              {doc.status === "completed" || doc.status === "signed" ? t("status_completed") : t("status_draft")}
            </Badge>
            <Button size="sm" variant="ghost" asChild className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Link href={`/clm/editor/${doc.id}`} className="flex items-center gap-1">
                {t("proj_btn_open_editor")}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {children.length > 0 && (
          <div className="relative">
            {children.map((child) => (
              <TreeNodeComponent key={child.document.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-background via-muted/5 to-background text-foreground min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border/80 bg-card/30 backdrop-blur-md relative overflow-hidden shadow-sm">
          <div className="space-y-2">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-3 w-3" /> {t("proj_back_list")}
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold tracking-tight">{project.name}</h1>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400 text-xs font-bold py-1 px-2.5 rounded-full uppercase tracking-wider">
                {project.code}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={handleValidate} 
              disabled={isScanning}
              variant="outline"
              className="border-border/60 text-foreground hover:bg-muted active:scale-95 transition-all duration-200"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
              {t("proj_btn_validate")}
            </Button>

            <Button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("proj_btn_import")}
            </Button>
          </div>
        </div>

        {/* Dynamic Details Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("proj_stat_docs")}</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.documents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("proj_stat_docs_desc")}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("proj_stat_alerts")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {alerts.filter(a => a.status === "unresolved").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("proj_stat_alerts_desc")}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("proj_stat_consistency")}</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {alerts.filter(a => a.status === "unresolved").length === 0 ? t("proj_consistency_ok") : t("proj_consistency_conflict")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("proj_stat_consistency_desc")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel (70%): Tree View */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {t("proj_tree_title")}
              </h2>
            </div>
            
            <Card className="bg-card/25 border-border/60 backdrop-blur-md shadow-sm">
              <CardContent className="p-6">
                {documentTree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Folder className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-sm">{t("proj_tree_empty_title")}</p>
                    <p className="text-xs mt-1">{t("proj_tree_empty_desc")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentTree.map((rootNode) => (
                      <TreeNodeComponent key={rootNode.document.id} node={rootNode} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel (30%): Mismatch Alerts */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("proj_alerts_title")}
            </h2>

            <div className="space-y-3">
              <AnimatePresence>
                {alerts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center text-emerald-600 dark:text-emerald-400 backdrop-blur-sm"
                  >
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-semibold text-sm">{t("proj_alerts_empty_title")}</p>
                    <p className="text-xs mt-1 text-muted-foreground">{t("proj_alerts_empty_desc")}</p>
                  </motion.div>
                ) : (
                  alerts.map((alert) => {
                    const isUnresolved = alert.status === "unresolved"
                    
                    return (
                      <motion.div
                        key={alert.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
                          isUnresolved
                            ? alert.severity === "high"
                              ? "border-red-500/30 bg-red-500/5 text-card-foreground shadow-sm"
                              : "border-amber-500/30 bg-amber-500/5 text-card-foreground shadow-sm"
                            : "border-emerald-500/20 bg-emerald-500/5 text-muted-foreground opacity-70"
                        }`}
                      >
                        {/* Decorative severity left accent indicator */}
                        {isUnresolved && (
                          <div 
                            className={`absolute left-0 top-0 bottom-0 w-[4px] ${
                              alert.severity === "high" ? "bg-red-500" : "bg-amber-500"
                            }`} 
                          />
                        )}

                        <div className="flex items-start gap-3">
                          {isUnresolved ? (
                            <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                              alert.severity === "high" ? "text-red-500 animate-pulse" : "text-amber-500"
                            }`} />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                          )}

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {FIELD_LABELS[alert.fieldKey] || alert.fieldKey}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  !isUnresolved
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : alert.severity === "high"
                                      ? "bg-red-500/10 text-red-600 border-red-500/20"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}
                              >
                                {isUnresolved ? (alert.severity === "high" ? t("proj_severity_high") : t("proj_severity_medium")) : t("proj_alert_resolved")}
                              </Badge>
                            </div>

                            <p className="text-xs leading-relaxed text-card-foreground font-medium">
                              {alert.description}
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/20 p-2 rounded-lg border border-border/40 mt-1">
                              <div className="min-w-0">
                                <span className="text-[10px] text-muted-foreground block font-medium">{t("proj_alert_original_label")}</span>
                                <span className="font-mono font-semibold block truncate" title={alert.sourceValue}>
                                  {alert.sourceValue || "—"}
                                </span>
                              </div>
                              <div className="min-w-0 border-l border-border/50 pl-2">
                                <span className="text-[10px] text-muted-foreground block font-medium">{t("proj_alert_mismatch_label")}</span>
                                <span className={`font-mono font-semibold block truncate ${
                                  isUnresolved ? "text-destructive" : ""
                                }`} title={alert.mismatchValue}>
                                  {alert.mismatchValue || "—"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                              <Link 
                                href={`/clm/editor/${alert.documentId}`}
                                className="hover:underline flex items-center gap-0.5 font-medium hover:text-foreground transition-colors"
                              >
                                {t("proj_alert_view_doc")}
                                <ArrowUpRight className="h-2.5 w-2.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>

      <AddProjectDocumentsModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        projectId={projectId}
        onSuccess={fetchData}
      />
    </div>
  )
}

interface UploadQueueFile {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  errorMsg?: string
}

function AddProjectDocumentsModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess: () => void
}) {
  const { t } = useT()
  const [files, setFiles] = useState<UploadQueueFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files).map((f) => ({
      file: f,
      status: "pending" as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearQueue = () => {
    setFiles([])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.dataTransfer.files) return
    const newFiles = Array.from(e.dataTransfer.files).map((f) => ({
      file: f,
      status: "pending" as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }

  const uploadAll = async () => {
    if (files.length === 0) return
    setIsUploading(true)

    // Set all pending files to uploading status
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" } : f))
    )

    let successCount = 0

    // Upload in parallel (up to 4 at a time to prevent server/browser congestion)
    const uploadFile = async (item: UploadQueueFile, index: number) => {
      const formData = new FormData()
      formData.append("files", item.file)

      try {
        await api.upload(`/clm/projects/${projectId}/import-files`, formData)
        
        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, status: "success", progress: 100 } : f))
        )
        successCount++
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, i) => (
            i === index
              ? { ...f, status: "error", errorMsg: err.message || t("proj_upload_failed") }
              : f
          ))
        )
      }
    }

    // Process queue
    const batchSize = 4
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      await Promise.all(
        batch.map((item, batchIdx) => {
          const globalIdx = i + batchIdx
          if (files[globalIdx].status === "pending" || files[globalIdx].status === "uploading") {
            return uploadFile(item, globalIdx)
          }
          return Promise.resolve()
        })
      )
    }

    setIsUploading(false)
    if (successCount > 0) {
      toast.success(t("proj_import_success", { n: successCount }))
      onSuccess()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] bg-card border-border/80 text-foreground max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {t("proj_modal_import_title")}
          </DialogTitle>
          <DialogDescription>
            {t("proj_modal_import_desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Buttons */}
        <div className="flex gap-3 py-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            {...({ webkitdirectory: "", directory: "" } as any)}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 border-border/60 hover:bg-muted/50"
          >
            <Upload className="mr-2 h-4 w-4" /> {t("proj_modal_btn_select_files")}
          </Button>
          <Button
            variant="outline"
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 border-border/60 hover:bg-muted/50"
          >
            <Folder className="mr-2 h-4 w-4" /> {t("proj_modal_btn_select_folder")}
          </Button>
        </div>

        {/* Drag and Drop Zone / File list */}
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex-1 min-h-[150px] overflow-y-auto border-2 border-dashed border-border/65 rounded-xl p-4 bg-muted/10 flex flex-col"
        >
          {files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
              <Upload className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">{t("proj_modal_queue_empty_title")}</p>
              <p className="text-xs mt-1">{t("proj_modal_queue_empty_desc")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card/60 text-sm hover:border-muted-foreground/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                     <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {item.status === "success" && (
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 text-[10px]">
                        {t("proj_badge_done")}
                      </Badge>
                    )}
                    {item.status === "error" && (
                      <Badge variant="destructive" className="text-[10px]" title={item.errorMsg}>
                        {t("proj_badge_error")}
                      </Badge>
                    )}
                    {item.status === "pending" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 shrink-0 flex gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={clearQueue}
            disabled={isUploading || files.length === 0}
            className="text-xs hover:bg-muted"
          >
            {t("proj_modal_btn_clear")}
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isUploading}>
              {t("common_close")}
            </Button>
            <Button
              onClick={uploadAll}
              disabled={isUploading || files.length === 0 || files.every((f) => f.status === "success")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md shadow-primary/10"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("proj_modal_btn_importing")}
                </>
              ) : (
                t("proj_modal_btn_start_import")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
