import type { Metadata } from "next";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

const title = "Legal Practice Management System (LPMS)";
const description =
  "LPMS Lawzy: hệ thống quản lý và chuyển đổi số cho law firm và luật sư — hồ sơ vụ việc, quy trình và hiệu suất đội ngũ.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/products/lpms" },
  openGraph: {
    title: `${title} | LAWZY`,
    description,
    url: "/products/lpms",
    type: "website",
    images: [{ url: toAbsoluteUrl("/logo/lawzy-logo-whitebg.png"), alt: "LAWZY LPMS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | LAWZY`,
    description,
    images: [toAbsoluteUrl("/logo/lawzy-logo-whitebg.png")],
  },
};

export default function LpmsProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
