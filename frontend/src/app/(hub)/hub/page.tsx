import Link from "next/link";
import { BookOpen, Briefcase, ChevronRight } from "lucide-react";
import { HubLogoutButton } from "./hub-logout-button";

export const metadata = {
  title: "Lawzy - Select Product",
};

export default function HubPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-xl text-primary">Lawzy</div>
        </div>
        <div>
          <HubLogoutButton />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Chào mừng bạn trở lại!</h1>
            <p className="text-muted-foreground text-lg">
              Vui lòng chọn ứng dụng bạn muốn truy cập ngày hôm nay.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* CLM Card */}
            <Link 
              href="/clm/dashboard"
              className="group relative overflow-hidden rounded-2xl border bg-white p-8 hover:shadow-lg transition-all hover:border-primary/50 flex flex-col items-start gap-4"
            >
              <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">Contract Lifecycle Management</h3>
                <p className="text-muted-foreground">
                  Quản lý vòng đời hợp đồng, tạo mới, chỉnh sửa và lưu trữ tài liệu (CLM).
                </p>
              </div>
              <div className="mt-auto pt-6 flex items-center text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                Truy cập CLM <ChevronRight className="ml-1 h-4 w-4" />
              </div>
            </Link>

            {/* LPMS Card */}
            <Link 
              href="/lpms/dashboard"
              className="group relative overflow-hidden rounded-2xl border bg-white p-8 hover:shadow-lg transition-all hover:border-primary/50 flex flex-col items-start gap-4"
            >
              <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">Legal Practice Management</h3>
                <p className="text-muted-foreground">
                  Trợ lý AI, tra cứu án lệ, bóc tách dữ liệu hợp đồng hàng loạt (LPMS).
                </p>
              </div>
              <div className="mt-auto pt-6 flex items-center text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                Truy cập LPMS <ChevronRight className="ml-1 h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
