"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Sparkles, FolderKanban, TableProperties, Database, ArrowRight, Activity, FileText } from "lucide-react";

export default function LPMSDashboardPage() {
  const [stats] = useState({
    totalMatters: 12,
    activeTabular: 3,
    aiQueries: 145,
    storageUsed: "128 MB"
  });

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <div className="flex flex-col min-h-0 px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4 px-0 pt-6 pb-2 shrink-0 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight shrink-0">
            Tổng quan LPMS
          </h2>
        </div>

        <ScrollArea
          className="flex-1 min-h-0 -mx-4 sm:-mx-6 px-4 sm:px-6"
        >
          <div className="space-y-4 pt-4 pb-8 transition-all duration-300 ease-in-out opacity-100 translate-y-0">
            
            {/* CTA Banner */}
            <div className="bg-black rounded-lg p-6 text-white shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    Bắt đầu với AI Legal Assistant
                  </h3>
                  <p className="text-sm text-gray-300 mb-4 max-w-xl">
                    Tự động hoá quy trình pháp lý của bạn. Tạo vụ việc mới, tải lên hàng loạt hợp đồng để bóc tách điều khoản, hoặc trò chuyện với Trợ lý AI để tra cứu án lệ nhanh chóng.
                  </p>
                  <div className="flex justify-left gap-3">
                    <Button
                      className="bg-white text-black hover:bg-gray-100 shadow-sm"
                      asChild
                    >
                      <Link href="/lpms/tabular-analysis">
                        <TableProperties className="mr-2 h-4 w-4" />
                        Bóc tách hợp đồng
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="text-white border-gray-700 hover:bg-gray-800 hover:text-white"
                      asChild
                    >
                      <Link href="/lpms/assistant">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Chat với AI
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid 1 */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tổng số Vụ việc
                  </CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMatters}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vụ việc đang quản lý
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Phiên bóc tách
                  </CardTitle>
                  <TableProperties className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeTabular}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    đang hoạt động
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Lượt hỏi AI
                  </CardTitle>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.aiQueries}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    trong tháng này
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Dữ liệu lưu trữ
                  </CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.storageUsed}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    trên tổng 5 GB
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-1 lg:col-span-4 hover:shadow-md transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm">Hoạt động gần đây</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    {[
                      { title: "Bóc tách 5 hợp đồng đối tác phân phối", time: "2 giờ trước", type: "tabular" },
                      { title: "Tra cứu án lệ tranh chấp thương mại", time: "5 giờ trước", type: "ai" },
                      { title: "Tạo vụ việc mới: Sáp nhập cty A", time: "1 ngày trước", type: "matter" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          {item.type === "tabular" ? <TableProperties className="h-4 w-4 text-blue-500" /> : 
                           item.type === "ai" ? <Sparkles className="h-4 w-4 text-emerald-500" /> : 
                           <FolderKanban className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 lg:col-span-3 hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">
                    Hợp đồng đang chờ duyệt
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-4 pt-0 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-3 mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">5</span>
                      <span className="text-sm text-muted-foreground">tài liệu cần xử lý</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full text-xs hover:bg-secondary/5 justify-between group border-border/30 rounded-xl mt-4"
                  >
                    <Link href="/lpms/tabular-analysis">
                      <span>Đi tới không gian bóc tách</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
