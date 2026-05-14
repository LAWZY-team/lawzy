import type { Metadata } from "next";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

const title = "Contract Lifecycle Management (CLM)";
const description =
  "Nền tảng CLM của Lawzy: chuẩn hóa quy trình hợp đồng, kiểm soát rủi ro và tăng tốc vận hành cho SMEs và phòng pháp chế.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/products/clm" },
  openGraph: {
    title: `${title} | LAWZY`,
    description,
    url: "/products/clm",
    type: "website",
    images: [{ url: toAbsoluteUrl("/logo/lawzy-logo-whitebg.png"), alt: "LAWZY CLM" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | LAWZY`,
    description,
    images: [toAbsoluteUrl("/logo/lawzy-logo-whitebg.png")],
  },
};

export default function ClmProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
