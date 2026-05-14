import type { Metadata } from "next";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

const title = "Điều khoản sử dụng";
const description = "Điều khoản sử dụng dịch vụ Lawzy — nền tảng legal tech cho quản lý hợp đồng và vận hành pháp lý.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/term" },
  openGraph: {
    title: `${title} | LAWZY`,
    description,
    url: "/term",
    type: "website",
    images: [{ url: toAbsoluteUrl("/logo/lawzy-logo-whitebg.png"), alt: "LAWZY" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | LAWZY`,
    description,
    images: [toAbsoluteUrl("/logo/lawzy-logo-whitebg.png")],
  },
};

export default function TermLayout({ children }: { children: React.ReactNode }) {
  return children;
}
