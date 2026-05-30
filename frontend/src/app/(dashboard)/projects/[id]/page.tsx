"use client"

import { useState, useEffect, use } from "react"
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
  ArrowUpRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { api } from "@/lib/api/client"
import { motion, AnimatePresence } from "framer-motion"

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

const FIELD_LABELS: Record<string, string> = {
  capacity: "Công suất",
  location: "Địa điểm",
  developerName: "Chủ đầu tư",
  contractorName: "Nhà thầu",
  projectName: "Tên dự án",
}

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
  const resolvedParams = use(params)
  const projectId = resolvedParams.id

  const [project, setProject] = useState<Project | null>(null)
  const [alerts, setAlerts] = useState<MismatchAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)

  const fetchData = async () => {
    try {
      const [projData, alertsData] = await Promise.all([
        api.get<Project>(`/projects/${projectId}`),
        api.get<MismatchAlert[]>(`/projects/${projectId}/mismatch-alerts`),
      ])
      setProject(projData)
      setAlerts(alertsData)
    } catch (err) {
      console.error("Failed to load project details", err)
      toast.error("Không thể tải thông tin dự án")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleValidate = async () => {
    setIsScanning(true)
    const toastId = toast.loading("Đang quét và đối chiếu chéo thông số chéo...")
    try {
      await api.post(`/projects/${projectId}/validate-consistency`)
      toast.success("Quét nhất quán thông số thành công", { id: toastId })
      await fetchData()
    } catch (err) {
      console.error("Scan error", err)
      toast.error("Quét nhất quán thất bại", { id: toastId })
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
        <h2 className="text-xl font-bold">Không tìm thấy dự án</h2>
        <p className="text-muted-foreground">Dự án không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Button asChild>
          <Link href="/dashboard">Quay lại Tổng quan</Link>
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
                  {doc.type === "contract" ? "Hợp đồng gốc" : "Phụ lục"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cập nhật lần cuối: {new Date(doc.updatedAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge 
              variant={doc.status === "completed" || doc.status === "signed" ? "default" : "secondary"}
              className="text-xs"
            >
              {doc.status === "completed" || doc.status === "signed" ? "Hoàn thành" : "Nháp"}
            </Badge>
            <Button size="sm" variant="ghost" asChild className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Link href={`/editor/${doc.id}`} className="flex items-center gap-1">
                Mở Editor
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
              <ArrowLeft className="h-3 w-3" /> Quay lại danh sách
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-all duration-200"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
              Đối chiếu thông số
            </Button>
          </div>
        </div>

        {/* Dynamic Details Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tài liệu liên kết</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.documents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Hợp đồng & Phụ lục</p>
            </CardContent>
          </Card>
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cảnh báo sai lệch</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {alerts.filter(a => a.status === "unresolved").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Chưa được giải quyết</p>
            </CardContent>
          </Card>
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái Nhất quán</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {alerts.filter(a => a.status === "unresolved").length === 0 ? "Nhất quán" : "Mâu thuẫn"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Độ chính xác pháp lý</p>
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
                Cây Tài Liệu Dự Án
              </h2>
            </div>
            
            <Card className="bg-card/25 border-border/60 backdrop-blur-md shadow-sm">
              <CardContent className="p-6">
                {documentTree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Folder className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-sm">Chưa có tài liệu nào</p>
                    <p className="text-xs mt-1">Hãy thêm tài liệu vào dự án này từ trang quản lý tài liệu.</p>
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
              Cảnh Báo Sai Lệch
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
                    <p className="font-semibold text-sm">Hồ sơ hoàn toàn nhất quán!</p>
                    <p className="text-xs mt-1 text-muted-foreground">Không phát hiện mâu thuẫn chéo nào giữa các tài liệu.</p>
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
                                {isUnresolved ? (alert.severity === "high" ? "Cao" : "Trung bình") : "Đã sửa"}
                              </Badge>
                            </div>

                            <p className="text-xs leading-relaxed text-card-foreground font-medium">
                              {alert.description}
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/20 p-2 rounded-lg border border-border/40 mt-1">
                              <div className="min-w-0">
                                <span className="text-[10px] text-muted-foreground block font-medium">Gốc:</span>
                                <span className="font-mono font-semibold block truncate" title={alert.sourceValue}>
                                  {alert.sourceValue || "—"}
                                </span>
                              </div>
                              <div className="min-w-0 border-l border-border/50 pl-2">
                                <span className="text-[10px] text-muted-foreground block font-medium">Lệch:</span>
                                <span className={`font-mono font-semibold block truncate ${
                                  isUnresolved ? "text-destructive" : ""
                                }`} title={alert.mismatchValue}>
                                  {alert.mismatchValue || "—"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                              <Link 
                                href={`/editor/${alert.documentId}`}
                                className="hover:underline flex items-center gap-0.5 font-medium hover:text-foreground transition-colors"
                              >
                                Xem tài liệu phát sinh
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
    </div>
  )
}
