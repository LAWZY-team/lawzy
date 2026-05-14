import type { Metadata } from "next";
import { LandingLanguageProvider } from "@/components/landing/language-provider";
import { OrganizationWebsiteJsonLd } from "@/components/seo/organization-website-json-ld";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingLanguageProvider>
      <OrganizationWebsiteJsonLd />
      {children}
    </LandingLanguageProvider>
  );
}
