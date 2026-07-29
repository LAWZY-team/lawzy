import type { Metadata } from "next";
import { LawfirmDemoShell } from "@/components/lawfirm-demo/lawfirm-demo-shell";

export const metadata: Metadata = {
  title: "Điền hồ sơ tự động | LAWZY",
  description:
    "Bản demo frontend quản lý hồ sơ khách hàng, bộ tài liệu mẫu và điền DOCX tự động.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LawfirmDemoPage() {
  return <LawfirmDemoShell />;
}

