import type { Metadata } from "next";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

const title = "Chính sách bảo mật";
const description = "Chính sách bảo mật và xử lý dữ liệu khi sử dụng Lawzy.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: `${title} | LAWZY`,
    description,
    url: "/privacy-policy",
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

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
