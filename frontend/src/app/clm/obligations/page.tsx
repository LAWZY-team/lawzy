"use client"

import { useState, useEffect } from "react"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  Percent, 
  FileText, 
  Clock, 
  User, 
  ChevronRight, 
  Plus, 
  Trash2,
  ListTodo,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

interface Obligation {
  id: string
  documentId: string
  workspaceId: string
  picId: string | null
  title: string
  description: string | null
  status: "pending" | "in_progress" | "completed" | "overdue" | "escalated"
  dueDate: string
  amount: number | null
  percentage: number | null
  triggerCondition: string | null
  obligationType: "warranty" | "payment" | "inspection" | "delivery" | "other" | null
  effectivePeriod: string | null
  responsibleVendor: string | null
  document?: {
    id: string
    title: string
  }
}

interface WorkspaceMember {
  userId: string
  role: string
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

interface WorkspaceDetails {
  id: string
  name: string
  members: WorkspaceMember[]
}

const COLUMN_KEYS: Array<Obligation["status"]> = ["pending", "in_progress", "completed", "overdue", "escalated"]

const COLUMN_LABELS: Record<Obligation["status"], string> = {
  pending: "AI Đề Xuất / Chờ Duyệt",
  in_progress: "Đang Thực Hiện",
  completed: "Đã Hoàn Thành",
  overdue: "Quá Hạn",
  escalated: "Leo Thang SLA"
}

const COLUMN_COLORS: Record<Obligation["status"], string> = {
  pending: "border-border bg-muted/40 text-muted-foreground",
  in_progress: "border-border bg-muted/20 text-foreground font-medium",
  completed: "border-border bg-muted/60 text-muted-foreground line-through opacity-85",
  overdue: "border-red-500/20 bg-red-500/5 text-red-500 font-semibold animate-pulse",
  escalated: "border-amber-500/20 bg-amber-500/5 text-amber-600 font-bold"
}

const OBLIGATION_TYPE_LABELS: Record<string, string> = {
  warranty: "Bảo hành",
  payment: "Thanh toán",
  inspection: "Nghiệm thu / Kiểm tra",
  delivery: "Bàn giao / Vận chuyển",
  other: "Khác"
}

export default function ObligationsPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const workspaceId = currentWorkspace?.id

  const [obligations, setObligations] = useState<Obligation[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"kanban" | "financial" | "non_financial">("kanban")
  
  // State phục vụ modal duyệt nghĩa vụ AI
  const [approvingObligation, setApprovingObligation] = useState<Obligation | null>(null)
  const [approvePicId, setApprovePicId] = useState<string>("")
  const [approveDueDate, setApproveDueDate] = useState<string>("")
  const [approveTitle, setApproveTitle] = useState<string>("")
  const [approveDesc, setApproveDesc] = useState<string>("")

  const fetchData = async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const [obsData, wsData] = await Promise.all([
        api.get<Obligation[]>(`/obligations?workspaceId=${workspaceId}`),
        api.get<WorkspaceDetails>(`/workspaces/${workspaceId}`)
      ])
      setObligations(obsData)
      setMembers(wsData.members || [])
    } catch (err) {
      console.error("Failed to load obligations or members", err)
      toast.error("Không thể tải thông tin nghĩa vụ hợp đồng")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [workspaceId])

  const handleStatusChange = async (id: string, newStatus: Obligation["status"]) => {
    // Tìm nghĩa vụ hiện tại
    const current = obligations.find(o => o.id === id)
    if (!current) return
    
    // Nếu chuyển từ pending sang in_progress hoặc completed mà chưa gán PIC, mở modal duyệt trước
    if (current.status === "pending" && newStatus !== "pending" && !current.picId) {
      setApprovingObligation(current)
      setApprovePicId(members[0]?.userId || "")
      setApproveDueDate(new Date(current.dueDate).toISOString().substring(0, 10))
      setApproveTitle(current.title)
      setApproveDesc(current.description || "")
      return
    }

    try {
      await api.patch(`/clm/obligations/${id}`, { status: newStatus })
      toast.success(`Cập nhật trạng thái nghĩa vụ thành công`)
      // Cập nhật state local
      setObligations(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    } catch (err) {
      console.error("Failed to update status", err)
      toast.error("Cập nhật trạng thái thất bại")
    }
  }

  const handleApprove = async () => {
    if (!approvingObligation) return
    try {
      await api.patch(`/clm/obligations/${approvingObligation.id}`, {
        title: approveTitle,
        description: approveDesc,
        picId: approvePicId || null,
        dueDate: new Date(approveDueDate).toISOString(),
        status: "in_progress"
      })
      toast.success("Đã duyệt nghĩa vụ và phân bổ người chịu trách nhiệm thành công")
      setApprovingObligation(null)
      fetchData()
    } catch (err) {
      console.error("Approve error", err)
      toast.error("Duyệt nghĩa vụ thất bại")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nghĩa vụ này không?")) return
    try {
      await api.delete(`/clm/obligations/${id}`)
      toast.success("Xóa nghĩa vụ thành công")
      setObligations(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      console.error("Delete error", err)
      toast.error("Xóa nghĩa vụ thất bại")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8 max-w-7xl mx-auto w-full">
        <div className="space-y-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  // Phân loại nghĩa vụ theo tab
  const filteredObligations = obligations.filter(ob => {
    if (activeTab === "financial") {
      return ob.amount !== null || ob.percentage !== null
    }
    if (activeTab === "non_financial") {
      return ob.amount === null && ob.percentage === null
    }
    return true
  })

  // Tìm tên PIC
  const getPicName = (picId: string | null) => {
    if (!picId) return "Chưa phân bổ"
    const m = members.find(member => member.userId === picId)
    return m?.user.name || "Không xác định"
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-background via-muted/5 to-background text-foreground min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border/80 bg-card/30 backdrop-blur-md relative overflow-hidden shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-extrabold tracking-tight">Bảng Quản Lý Nghĩa Vụ Hợp Đồng</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/60">
            <Button 
              size="sm" 
              variant={activeTab === "kanban" ? "default" : "ghost"}
              onClick={() => setActiveTab("kanban")}
              className="rounded-lg text-xs"
            >
              <Layers className="h-3 w-3 mr-1" />
              Kanban Board
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === "financial" ? "default" : "ghost"}
              onClick={() => setActiveTab("financial")}
              className="rounded-lg text-xs"
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Nghĩa vụ Tài chính
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === "non_financial" ? "default" : "ghost"}
              onClick={() => setActiveTab("non_financial")}
              className="rounded-lg text-xs"
            >
              <ListTodo className="h-3 w-3 mr-1" />
              Phi Tài chính
            </Button>
          </div>
        </div>

        {/* Stats Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng nghĩa vụ</CardTitle>
              <Layers className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{obligations.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cần duyệt (AI Đề xuất)</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {obligations.filter(o => o.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đã hoàn thành</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {obligations.filter(o => o.status === "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/20 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quá hạn & Leo thang</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {obligations.filter(o => o.status === "overdue" || o.status === "escalated").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal duyệt nghĩa vụ AI */}
        <AnimatePresence>
          {approvingObligation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/80 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-foreground" />
                  <h3 className="text-lg font-bold">Duyệt gợi ý nghĩa vụ của AI</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Tiêu đề nghĩa vụ:</label>
                    <Input 
                      value={approveTitle} 
                      onChange={(e) => setApproveTitle(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Mô tả nghĩa vụ:</label>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={approveDesc} 
                      onChange={(e) => setApproveDesc(e.target.value)} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Thời hạn thực hiện (Due Date):</label>
                      <Input 
                        type="date"
                        value={approveDueDate} 
                        onChange={(e) => setApproveDueDate(e.target.value)} 
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Người phụ trách (PIC):</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={approvePicId}
                        onChange={(e) => setApprovePicId(e.target.value)}
                      >
                        <option value="">-- Chọn PIC chịu trách nhiệm --</option>
                        {members.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.user.name} ({member.user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setApprovingObligation(null)}>Hủy bỏ</Button>
                  <Button className="bg-foreground text-background hover:bg-muted-foreground" onClick={handleApprove}>
                    Duyệt & Bắt đầu
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Tab content conditional render */}
        {activeTab === "kanban" ? (
          /* KANBAN VIEW */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start min-h-[500px]">
            {COLUMN_KEYS.map((colKey) => {
              const colObligations = filteredObligations.filter(o => o.status === colKey)
              
              return (
                <div 
                  key={colKey}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/plain")
                    handleStatusChange(id, colKey)
                  }}
                  className="flex flex-col h-full min-h-[400px] rounded-2xl border border-border/40 bg-card/10 p-3 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-3 px-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate" title={COLUMN_LABELS[colKey]}>
                      {COLUMN_LABELS[colKey]}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded ${COLUMN_COLORS[colKey]}`}>
                      {colObligations.length}
                    </Badge>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                    {colObligations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground/30 border border-dashed border-border/20 rounded-xl min-h-[120px]">
                        <Clock className="h-6 w-6 mb-2" />
                        <span className="text-[10px]">Kéo thả thẻ vào đây</span>
                      </div>
                    ) : (
                      colObligations.map((ob) => (
                        <motion.div
                          key={ob.id}
                          layout
                          draggable
                          onDragStart={(e: any) => {
                            e.dataTransfer.setData("text/plain", ob.id)
                          }}
                          className={`p-3 rounded-xl border bg-card/40 cursor-grab active:cursor-grabbing hover:border-muted-foreground/30 transition-all duration-200 relative overflow-hidden group shadow-sm`}
                        >
                          {/* Accent left indicator depending on column status */}
                          <div 
                            className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                              ob.status === "completed" 
                                ? "bg-muted-foreground/30" 
                                : ob.status === "overdue" 
                                  ? "bg-red-500 animate-pulse" 
                                  : ob.status === "escalated" 
                                    ? "bg-amber-500"
                                    : ob.status === "pending"
                                      ? "bg-muted"
                                      : "bg-foreground"
                            }`} 
                          />

                          <div className="space-y-2 pl-1.5">
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-semibold text-xs leading-normal line-clamp-2 block text-card-foreground group-hover:text-primary transition-colors">
                                {ob.title}
                              </span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDelete(ob.id)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded-md transition-opacity duration-200"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            {ob.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {ob.description}
                              </p>
                            )}

                            {/* PIC & Time Indicators */}
                            <div className="flex flex-col gap-1 text-[10px] text-muted-foreground border-t border-border/30 pt-2 mt-1.5">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <span className="truncate font-medium">{getPicName(ob.picId)}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <span>Hạn: {new Date(ob.dueDate).toLocaleDateString("vi-VN")}</span>
                              </div>

                              {ob.amount !== null && (
                                <div className="flex items-center gap-1 font-semibold text-primary/95 mt-0.5">
                                  <DollarSign className="h-3 w-3 shrink-0" />
                                  <span>{ob.amount.toLocaleString("vi-VN")} VND</span>
                                </div>
                              )}
                            </div>

                            {ob.obligationType && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 rounded font-normal bg-muted/20 border-border/50 block w-fit">
                                {OBLIGATION_TYPE_LABELS[ob.obligationType] || ob.obligationType}
                              </Badge>
                            )}

                            {ob.status === "pending" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusChange(ob.id, "in_progress")}
                                className="w-full mt-2 bg-secondary hover:bg-foreground hover:text-background border border-border text-[10px] h-7 rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <Sparkles className="h-3 w-3" />
                                Phê duyệt Nghĩa vụ
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* FINANCIAL & NON-FINANCIAL LIST VIEW */
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {activeTab === "financial" ? (
                <>
                  <DollarSign className="h-5 w-5 text-primary" />
                  Danh Sách Nghĩa Vụ Tài Chính Hợp Đồng
                </>
              ) : (
                <>
                  <ListTodo className="h-5 w-5 text-muted-foreground" />
                  Danh Sách Nghĩa Vụ Phi Tài Chính Hợp Đồng
                </>
              )}
            </h2>

            <Card className="bg-card/25 border-border/60 backdrop-blur-md shadow-sm">
              <CardContent className="p-6">
                {filteredObligations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-sm">Chưa có nghĩa vụ nào thuộc nhóm này</p>
                    <p className="text-xs mt-1">Các nghĩa vụ sẽ được AI tự động bóc tách từ các hợp đồng đã ký duyệt.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {filteredObligations.map((ob) => (
                      <div key={ob.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-card-foreground">
                              {ob.title}
                            </span>
                            <Badge className={`text-[10px] px-1.5 py-0 rounded ${COLUMN_COLORS[ob.status]}`}>
                              {COLUMN_LABELS[ob.status]}
                            </Badge>
                          </div>
                          
                          {ob.description && (
                            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                              {ob.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <User className="h-3 w-3 shrink-0" />
                              PIC: <strong>{getPicName(ob.picId)}</strong>
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3 shrink-0" />
                              Hạn: <strong>{new Date(ob.dueDate).toLocaleDateString("vi-VN")}</strong>
                            </span>
                            {ob.obligationType && (
                              <span className="flex items-center gap-0.5">
                                <Layers className="h-3 w-3 shrink-0" />
                                Loại: <strong>{OBLIGATION_TYPE_LABELS[ob.obligationType] || ob.obligationType}</strong>
                              </span>
                            )}
                          </div>

                          {/* Chi tiết tài chính đặc thù */}
                          {activeTab === "financial" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/40 max-w-xl mt-2">
                              {ob.amount !== null && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-medium">Số tiền:</span>
                                  <span className="font-semibold text-primary">{ob.amount.toLocaleString("vi-VN")} VND</span>
                                </div>
                              )}
                              {ob.percentage !== null && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-medium">Phần trăm thanh toán:</span>
                                  <span className="font-semibold text-primary">{ob.percentage}%</span>
                                </div>
                              )}
                              {ob.triggerCondition && (
                                <div className="col-span-full border-t border-border/30 pt-1.5 mt-1.5">
                                  <span className="text-[10px] text-muted-foreground block font-medium">Điều kiện kích hoạt đợt thanh toán:</span>
                                  <span className="font-medium text-card-foreground leading-normal">{ob.triggerCondition}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Chi tiết phi tài chính đặc thù */}
                          {activeTab === "non_financial" && (ob.effectivePeriod || ob.responsibleVendor) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/40 max-w-xl mt-2">
                              {ob.effectivePeriod && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-medium">Thời gian bảo hành / Hiệu lực:</span>
                                  <span className="font-semibold text-foreground">{ob.effectivePeriod}</span>
                                </div>
                              )}
                              {ob.responsibleVendor && (
                                <div>
                                  <span className="text-[10px] text-muted-foreground block font-medium">Đơn vị chịu trách nhiệm chính:</span>
                                  <span className="font-semibold text-foreground">{ob.responsibleVendor}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {ob.status === "pending" ? (
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setApprovingObligation(ob)
                                setApprovePicId(members[0]?.userId || "")
                                setApproveDueDate(new Date(ob.dueDate).toISOString().substring(0, 10))
                                setApproveTitle(ob.title)
                                setApproveDesc(ob.description || "")
                              }}
                              className="bg-foreground text-background hover:bg-muted-foreground gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              Duyệt & Phân PIC
                            </Button>
                          ) : (
                            <select
                              className="flex h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              value={ob.status}
                              onChange={(e) => handleStatusChange(ob.id, e.target.value as Obligation["status"])}
                            >
                              {COLUMN_KEYS.map((k) => (
                                <option key={k} value={k}>
                                  {COLUMN_LABELS[k]}
                                </option>
                              ))}
                            </select>
                          )}

                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(ob.id)}
                            className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
