import type { Metadata } from "next";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

const title = "Liên hệ";
const description =
  "Liên hệ Lawzy để được tư vấn về Contract Lifecycle Management và Legal Practice Management System cho doanh nghiệp và law firm.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `${title} | LAWZY`,
    description,
    url: "/contact",
    type: "website",
    images: [{ url: toAbsoluteUrl("/logo/lawzy-logo-whitebg.png"), alt: "LAWZY — liên hệ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | LAWZY`,
    description,
    images: [toAbsoluteUrl("/logo/lawzy-logo-whitebg.png")],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
