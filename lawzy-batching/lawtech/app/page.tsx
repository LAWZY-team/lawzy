import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16 sm:px-10">
        <section className="space-y-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            Lawzy Legal - Batching Information
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Tự động điền 13 mẫu tài liệu FDI từ một Master Form
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Ứng dụng hỗ trợ intern và paralegal nhập dữ liệu một lần, đồng bộ
            vào toàn bộ bộ hồ sơ đăng ký doanh nghiệp có vốn đầu tư nước ngoài,
            giảm thao tác copy-paste thủ công.
          </p>
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold">Mục tiêu MVP</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Batch fill 13 mẫu tài liệu trong 10 giây và xuất zip trong 30 giây.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold">Công nghệ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Next.js, TypeScript, Supabase và NestJS backend xử lý tài liệu.
            </p>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold">Flow đang có</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            <li>Dashboard quản lý hồ sơ với dữ liệu mock.</li>
            <li>Case workspace gồm Master Form, template selector, preview và export.</li>
            <li>NestJS backend scaffold cho `POST /batch` và `GET /health`.</li>
          </ul>
          <div className="mt-6 flex flex-col gap-3 text-base font-medium sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-white transition hover:bg-slate-800"
              href="/dashboard"
            >
              Đi đến Dashboard
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-slate-700 transition hover:bg-slate-100"
              href="/cases/new"
            >
              Tạo case mới
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
