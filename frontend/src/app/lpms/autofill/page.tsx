"use client"

import { useState } from "react"
import { AutofillProfileTab } from "./components/AutofillProfileTab"
import { AutofillTemplatesTab } from "./components/AutofillTemplatesTab"
import { AutofillBatchFillTab } from "./components/AutofillBatchFillTab"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, FolderOpen, Download } from "lucide-react"

export default function AutofillWorkspacePage() {
  const [activeTab, setActiveTab] = useState<"profile" | "templates" | "fill">("profile")

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background text-foreground">
      {/* Notion-style Clean Header */}
      <div className="px-8 py-6 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-background">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground">
            Autofill Hồ Sơ Tự Động
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Quản lý từ khóa placeholder, biểu mẫu và tự động điền hồ sơ văn bản.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
          <TabsList className="bg-muted/40 p-1 rounded-lg h-9 border border-border/40">
            <TabsTrigger
              value="profile"
              className="rounded-md text-xs font-medium px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:font-semibold transition-all"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              1. Hồ Sơ Khách Hàng
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="rounded-md text-xs font-medium px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:font-semibold transition-all"
            >
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              2. Bộ Hồ Sơ Mẫu
            </TabsTrigger>
            <TabsTrigger
              value="fill"
              className="rounded-md text-xs font-medium px-3.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs data-[state=active]:font-semibold transition-all"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              3. Điền & Xuất (.ZIP)
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "profile" && <AutofillProfileTab />}
        {activeTab === "templates" && <AutofillTemplatesTab />}
        {activeTab === "fill" && <AutofillBatchFillTab />}
      </div>
    </div>
  )
}
