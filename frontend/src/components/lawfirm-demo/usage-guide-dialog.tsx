"use client";

import { BookOpen, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Locale } from "./lawfirm-demo-types";

const content = {
  vi: {
    button: "Hướng dẫn sử dụng",
    title: "Cách sử dụng trang điền hồ sơ",
    description:
      "Làm lần lượt theo các bước dưới đây. Thông tin khách hàng chỉ cần nhập một lần và có thể dùng cho nhiều tài liệu.",
    overviewTitle: "Cách hoạt động",
    overview:
      "Hồ sơ khách hàng là nguồn dữ liệu chung. Bộ hồ sơ mẫu xác định dữ liệu đó sẽ được đặt vào đâu. Khi điền hồ sơ, hệ thống kết hợp hai phần và tạo các file DOCX hoàn chỉnh.",
    steps: [
      {
        title: "Tạo hồ sơ khách hàng",
        body:
          "Mở Hồ sơ khách hàng, chọn Cá nhân hoặc Tổ chức rồi nhập các thông tin thực tế như tên, mã số thuế, địa chỉ và người đại diện. Dữ liệu được tự động lưu trong trình duyệt.",
      },
      {
        title: "Tạo bộ hồ sơ mẫu",
        body:
          "Mở Bộ hồ sơ mẫu, tạo một bộ mới rồi tải các file DOCX hoặc PDF thường dùng cùng nhau. Hệ thống sẽ đọc tài liệu và tìm các placeholder như [TÊN DOANH NGHIỆP] hoặc {{ten_doanh_nghiep}}.",
      },
      {
        title: "Ánh xạ các trường",
        body:
          "Với mỗi placeholder, chọn trường tương ứng trong hồ sơ khách hàng. Nhiều placeholder ở nhiều tài liệu có thể cùng dùng một trường. Nếu hệ thống bỏ sót, hãy bôi đen nội dung trong bản xem trước hoặc thêm trường thủ công.",
      },
      {
        title: "Hoàn tất bộ hồ sơ",
        body:
          "Kiểm tra bản xem trước, đánh dấu từng tài liệu đã hoàn tất rồi đưa bộ hồ sơ vào thư viện. Ở phần tổng hợp, bạn có thể điền thông tin còn thiếu một lần và lưu thẳng vào hồ sơ khách hàng.",
      },
      {
        title: "Điền và tải kết quả",
        body:
          "Mở Điền hồ sơ, chọn bộ hồ sơ mẫu và hồ sơ khách hàng. Kiểm tra số trường đã khớp, bấm Điền tự động vào tất cả, sau đó tải từng DOCX hoặc tải toàn bộ dưới dạng ZIP.",
      },
    ],
    quickTitle: "Cần xử lý nhanh một file?",
    quick:
      "Tại màn hình Điền hồ sơ, dùng phần Tải file khác để tải DOCX trực tiếp mà không cần tạo bộ mẫu. Chế độ này dùng danh sách placeholder đã khai báo trong hồ sơ khách hàng.",
    noteTitle: "Lưu ý",
    notes: [
      "DOCX có thể được điền và tải xuống. PDF chỉ dùng để đọc, xem trước và nhận diện trường.",
      "Dữ liệu nằm trong trình duyệt hiện tại và không tự đồng bộ sang thiết bị khác.",
      "Sửa nội dung trong bản xem trước không làm thay đổi file DOCX gốc.",
    ],
    close: "Đã hiểu",
  },
  en: {
    button: "User guide",
    title: "How to use document autofill",
    description:
      "Follow these steps in order. Client information is entered once and can be reused across many documents.",
    overviewTitle: "How it works",
    overview:
      "The client profile is the shared data source. A template set defines where that data belongs. The Fill documents screen combines both parts and creates completed DOCX files.",
    steps: [
      {
        title: "Create a client profile",
        body:
          "Open Client profiles, choose Individual or Organization, then enter real information such as name, tax code, address and legal representative. Data is saved automatically in this browser.",
      },
      {
        title: "Create a template set",
        body:
          "Open Template sets, create a new set, then upload the DOCX or PDF files normally used together. The system reads each document and finds placeholders such as [COMPANY NAME] or {{company_name}}.",
      },
      {
        title: "Map the fields",
        body:
          "For each placeholder, choose the matching client profile field. Different placeholders across different documents can use the same field. If anything is missed, select text in the preview or add a field manually.",
      },
      {
        title: "Complete the template set",
        body:
          "Review the preview, mark each document complete, then add the template set to the library. In the combined field section, fill any missing information once and save it directly to the client profile.",
      },
      {
        title: "Fill and download",
        body:
          "Open Fill documents, choose a template set and client profile. Review the match count, select Auto-fill all, then download each DOCX or download everything as a ZIP file.",
      },
    ],
    quickTitle: "Need to process a file quickly?",
    quick:
      "On the Fill documents screen, use Upload other files to add DOCX files without creating a template set. This mode uses the placeholder list stored in the client profile.",
    noteTitle: "Important",
    notes: [
      "DOCX files can be filled and downloaded. PDF is only used for reading, preview and field detection.",
      "Data stays in this browser and does not sync automatically to another device.",
      "Editing preview content does not change the original DOCX file.",
    ],
    close: "Got it",
  },
} as const;

export function UsageGuideDialog({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const t = content[locale];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50",
            !compact && "w-full justify-start",
          )}
        >
          <BookOpen className="size-4" />
          {compact ? (locale === "vi" ? "Hướng dẫn" : "Guide") : t.button}
        </Button>
      </DialogTrigger>

      <DialogContent className="grid max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-zinc-200 bg-white p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-zinc-200 px-5 py-5 pr-12 text-left sm:px-6">
          <DialogTitle className="text-xl leading-7 text-zinc-950">{t.title}</DialogTitle>
          <DialogDescription className="max-w-xl text-sm leading-6 text-zinc-600">
            {t.description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <section className="rounded-md border border-zinc-950 bg-zinc-950 p-4 text-white">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 shrink-0" />
              <h3 className="text-sm font-semibold">{t.overviewTitle}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-200">{t.overview}</p>
          </section>

          <ol className="mt-5 space-y-0">
            {t.steps.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-b border-zinc-200 py-4 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="flex size-8 items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 text-sm font-semibold tabular-nums text-zinc-700">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">{t.quickTitle}</h3>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600">{t.quick}</p>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-semibold text-zinc-950">{t.noteTitle}</h3>
            <ul className="mt-3 space-y-2">
              {t.notes.map((note) => (
                <li key={note} className="flex items-start gap-2 text-sm leading-6 text-zinc-600">
                  <Check className="mt-1 size-4 shrink-0 text-zinc-950" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <DialogFooter className="border-t border-zinc-200 px-5 py-4 sm:px-6">
          <DialogClose asChild>
            <Button type="button" className="bg-zinc-950 text-white hover:bg-zinc-800">
              {t.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
