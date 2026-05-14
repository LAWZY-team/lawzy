import type { Metadata } from "next";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

const title = "Bảng giá";
const description =
  "Xem gói đăng ký Lawzy: Contract Lifecycle Management và dịch vụ pháp lý số. Chọn gói phù hợp cho doanh nghiệp hoặc liên hệ tư vấn.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `${title} | LAWZY`,
    description,
    url: "/pricing",
    type: "website",
    images: [{ url: toAbsoluteUrl("/logo/lawzy-logo-whitebg.png"), alt: "LAWZY — bảng giá" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | LAWZY`,
    description,
    images: [toAbsoluteUrl("/logo/lawzy-logo-whitebg.png")],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
