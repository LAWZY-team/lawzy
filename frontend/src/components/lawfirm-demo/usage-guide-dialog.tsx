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
    title: "Cách sử dụng điền hồ sơ tự động",
    description:
      "Làm lần lượt theo các bước dưới đây. Thông tin khách hàng chỉ cần nhập một lần, lưu theo tài khoản, và dùng lại cho nhiều bộ tài liệu.",
    overviewTitle: "Cách hoạt động",
    overview:
      "Hồ sơ khách hàng là nguồn dữ liệu chung. Bộ hồ sơ mẫu xác định dữ liệu đó sẽ được đặt vào đâu trong từng file. Khi điền hồ sơ, hệ thống kết hợp hai phần và tạo các file DOCX hoàn chỉnh để tải về (từng file hoặc ZIP).",
    steps: [
      {
        title: "Đăng nhập để lưu dữ liệu",
        body:
          "Đăng nhập bằng email/mật khẩu hoặc Google. Mọi hồ sơ khách hàng, bộ mẫu và lịch sử điền đều gắn với tài khoản của bạn — quay lại lần sau vẫn dùng được, không phụ thuộc trình duyệt.",
      },
      {
        title: "Tạo hồ sơ khách hàng",
        body:
          "Mở Hồ sơ khách hàng → Tạo mới. Chọn Cá nhân hoặc Tổ chức, rồi nhập tên, CCCD/MST, địa chỉ, người đại diện… Thông tin tự lưu khi bạn rời ô nhập (blur), không cần bấm Lưu sau mỗi lần gõ.",
      },
      {
        title: "Quét giấy tờ bằng AI (tùy chọn)",
        body:
          "Trong hồ sơ, tải ảnh CCCD / hộ chiếu / giấy ĐKKD. AI trích xuất các trường và hiện danh sách để bạn duyệt — sửa lại nếu OCR sai, bỏ chọn trường không cần, rồi phê duyệt trước khi ghi vào hồ sơ.",
      },
      {
        title: "Tạo bộ hồ sơ mẫu",
        body:
          "Mở Bộ hồ sơ mẫu → Tạo bộ mới. Tải các file DOCX hoặc PDF thường dùng cùng nhau (ví dụ: giấy đề nghị, quyết định, ủy quyền). Hệ thống đọc tài liệu, tìm placeholder như [TÊN DOANH NGHIỆP] hoặc {{ten_doanh_nghiep}}, và có thể gợi ý thêm trường bằng AI.",
      },
      {
        title: "Duyệt gợi ý AI và ánh xạ trường",
        body:
          "Với mỗi trường nhận diện: kiểm tra tên, placeholder, số lần xuất hiện; chọn ánh xạ với trường hồ sơ khách hàng tương ứng. Nhiều placeholder ở nhiều tài liệu có thể cùng dùng một trường. Bôi đen chữ trong bản xem trước hoặc thêm trường thủ công nếu hệ thống bỏ sót. Phê duyệt gợi ý AI trước khi chúng trở thành trường chính thức.",
      },
      {
        title: "Hoàn tất bộ hồ sơ",
        body:
          "Đánh dấu từng tài liệu đã xong, rồi đánh dấu bộ hồ sơ Hoàn tất để đưa vào thư viện. Chỉ bộ đã hoàn tất mới dùng được ở bước Điền hồ sơ. Bạn có thể thêm hướng dẫn sử dụng cho bộ mẫu để đồng nghiệp biết khi nào nên dùng.",
      },
      {
        title: "Điền và tải kết quả",
        body:
          "Mở Điền hồ sơ → chọn bộ mẫu + hồ sơ khách hàng. Kiểm tra số trường đã khớp, bấm Điền tự động, rồi tải từng DOCX hoặc tải toàn bộ dưới dạng ZIP.",
      },
    ],
    sectionsTitle: "Chi tiết từng màn hình",
    sections: [
      {
        title: "Hồ sơ khách hàng",
        body:
          "Thư viện liệt kê hồ sơ đã lưu; Tạo mới / Xem trước mở chế độ chỉnh sửa. Alias (cụm từ cần tìm) giúp khớp nhiều cách viết trong DOCX. Sửa giá trị AI trước khi lưu nếu nhận diện sai.",
      },
      {
        title: "Bộ hồ sơ mẫu",
        body:
          "Ba cột: danh sách tài liệu → xem trước → trường nhận diện. Sửa nội dung xem trước chỉ phục vụ đánh dấu trường trong công cụ, không ghi đè file DOCX gốc. Việc điền thật chỉ thay thế đúng vị trí placeholder khi xuất file.",
      },
      {
        title: "Điền hồ sơ",
        body:
          "Hệ thống điền theo ánh xạ từng tài liệu (placeholder ↔ trường hồ sơ). Trường trống hoặc chưa ánh xạ sẽ không được điền. PDF chỉ xem/nhận diện — chỉ DOCX được điền và tải xuống.",
      },
    ],
    quickTitle: "Mẹo làm việc nhanh",
    quickTips: [
      "Làm theo thứ tự: Hồ sơ khách hàng → Bộ hồ sơ mẫu → Điền hồ sơ.",
      "Một hồ sơ khách hàng có thể dùng cho nhiều bộ mẫu khác nhau.",
      "Đánh dấu Hoàn tất bộ mẫu trước khi sang bước điền.",
      "Luôn duyệt kết quả AI (CCCD và gợi ý trường) trước khi lưu.",
    ],
    noteTitle: "Lưu ý quan trọng",
    notes: [
      "DOCX có thể được điền và tải xuống. PDF chỉ dùng để đọc, xem trước và nhận diện trường.",
      "Dữ liệu lưu trên máy chủ theo tài khoản đã đăng nhập — không chỉ nằm trong trình duyệt.",
      "Sửa nội dung trong bản xem trước không làm thay đổi file DOCX gốc; file gốc chỉ được điền tại các placeholder đã ánh xạ.",
      "Thông tin khách hàng và bộ mẫu thuộc không gian làm việc của bạn; đồng nghiệp chỉ thấy bộ mẫu nếu bạn chia sẻ công khai (nếu có).",
    ],
    close: "Đã hiểu",
  },
  en: {
    button: "User guide",
    title: "How to use document autofill",
    description:
      "Follow these steps in order. Client information is entered once, saved to your account, and reused across many document sets.",
    overviewTitle: "How it works",
    overview:
      "The client profile is the shared data source. A template set defines where that data belongs in each file. The Fill documents screen combines both and creates completed DOCX files for download (individually or as a ZIP).",
    steps: [
      {
        title: "Sign in to keep your data",
        body:
          "Sign in with email/password or Google. Profiles, template sets, and fill history are tied to your account — they remain available next time, independent of the browser.",
      },
      {
        title: "Create a client profile",
        body:
          "Open Client profiles → Create new. Choose Individual or Organization, then enter name, ID/tax code, address, representative, and so on. Changes save when you leave a field (on blur); you do not need to click Save after every keystroke.",
      },
      {
        title: "Scan ID documents with AI (optional)",
        body:
          "In a profile, upload a citizen ID / passport / business registration image. AI extracts fields and shows a review list — correct OCR mistakes, uncheck what you do not need, then approve before writing into the profile.",
      },
      {
        title: "Create a template set",
        body:
          "Open Template sets → Create new set. Upload the DOCX or PDF files normally used together. The system reads each file, finds placeholders such as [COMPANY NAME] or {{company_name}}, and may suggest more fields with AI.",
      },
      {
        title: "Review AI suggestions and map fields",
        body:
          "For each detected field: check the label, placeholder, and occurrence count; map it to the matching client-profile field. Different placeholders across documents can share one field. Select text in the preview or add a field manually if anything is missed. Approve AI suggestions before they become official fields.",
      },
      {
        title: "Complete the template set",
        body:
          "Mark each document done, then mark the set Complete so it appears in the library. Only completed sets can be used on the Fill documents screen. You can add usage notes so colleagues know when to use the set.",
      },
      {
        title: "Fill and download",
        body:
          "Open Fill documents → choose a template set and client profile. Review the match count, run Auto-fill, then download each DOCX or download everything as a ZIP.",
      },
    ],
    sectionsTitle: "Screen-by-screen details",
    sections: [
      {
        title: "Client profiles",
        body:
          "The library lists saved profiles; Create / Preview opens the editor. Aliases (search phrases) help match alternate spellings in DOCX files. Edit AI-extracted values before saving if recognition is wrong.",
      },
      {
        title: "Template sets",
        body:
          "Three panes: document list → preview → detected fields. Editing preview text only helps you mark fields in the tool; it does not overwrite the original DOCX. Real filling replaces only mapped placeholders when exporting.",
      },
      {
        title: "Fill documents",
        body:
          "Filling uses per-document mappings (placeholder ↔ profile field). Empty or unmapped fields are skipped. PDF is for reading/detection only — only DOCX files are filled and downloaded.",
      },
    ],
    quickTitle: "Quick tips",
    quickTips: [
      "Work in order: Client profiles → Template sets → Fill documents.",
      "One client profile can be reused across many template sets.",
      "Mark a template set Complete before filling.",
      "Always review AI results (ID scan and field suggestions) before saving.",
    ],
    noteTitle: "Important",
    notes: [
      "DOCX files can be filled and downloaded. PDF is only used for reading, preview, and field detection.",
      "Data is stored on the server under your signed-in account — not only in the browser.",
      "Editing preview content does not change the original DOCX; the original is filled only at mapped placeholders.",
      "Profiles and template sets belong to your workspace; colleagues only see a set if you share it publicly (when available).",
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

          <section className="mt-5">
            <h3 className="text-sm font-semibold text-zinc-950">{t.sectionsTitle}</h3>
            <ul className="mt-3 space-y-3">
              {t.sections.map((section) => (
                <li key={section.title} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <h4 className="text-sm font-semibold text-zinc-950">{section.title}</h4>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600">{section.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">{t.quickTitle}</h3>
            <ul className="mt-3 space-y-2">
              {t.quickTips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm leading-6 text-zinc-600">
                  <Check className="mt-1 size-4 shrink-0 text-zinc-950" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
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
