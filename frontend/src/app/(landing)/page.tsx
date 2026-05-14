import type { Metadata } from "next";
import { ContactModalProvider } from "@/components/landing/contact-modal";
import { LandingHomeClient } from "@/components/landing/landing-home-client";
import { getPublicSiteUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

const title = "LAWZY - Nền tảng quản lý hợp đồng pháp lý";
const description =
  "Tạo, chỉnh sửa, review và quản lý hợp đồng pháp luật theo luật Việt Nam 2026. Lawzy cung cấp CLM và LPMS cho doanh nghiệp và law firm.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
    languages: { "vi-VN": `${getPublicSiteUrl()}/` },
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "LAWZY",
    locale: "vi_VN",
    type: "website",
    images: [{ url: toAbsoluteUrl("/logo/lawzy-logo-whitebg.png"), alt: "Logo LAWZY - nền tảng legal tech" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [toAbsoluteUrl("/logo/lawzy-logo-whitebg.png")],
  },
};

export default function LandingPage() {
  return (
    <ContactModalProvider>
      <LandingHomeClient />
    </ContactModalProvider>
  );
}
