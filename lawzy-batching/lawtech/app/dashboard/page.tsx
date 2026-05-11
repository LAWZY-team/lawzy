import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: cases, error } = await supabase
    .from("cases")
    .select("*")
    .order("updated_at", { ascending: false });

  const safeCases = cases ?? [];
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Lawzy Legal</p>
            <h1 className="mt-1 text-2xl font-semibold">Danh sách hồ sơ</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Theo dõi các case FDI, mở lại Master Form và export bộ tài liệu từ
              một nguồn dữ liệu duy nhất.
            </p>
          </div>
          <Link
            href="/cases/new"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Tạo hồ sơ mới
          </Link>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>{safeCases.length}</CardTitle>
              <CardDescription>Hồ sơ đang quản lý</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>13</CardTitle>
              <CardDescription>Template mục tiêu cho bộ FDI</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>30s</CardTitle>
              <CardDescription>Chu kỳ auto-save theo SRS</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Cases</CardTitle>
            <CardDescription>
              Danh sách các hồ sơ FDI. Nhấn vào để tiếp tục chỉnh sửa hoặc export.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {safeCases.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có hồ sơ nào. Hãy tạo mới.</p>
            ) : (
              safeCases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="flex flex-col gap-3 rounded-xl border p-4 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{caseItem.name}</h2>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          caseItem.status === "completed"
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {caseItem.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Cập nhật: {new Date(caseItem.updated_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    Mở hồ sơ &rarr;
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
