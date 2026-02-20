import { LandingLanguageProvider } from "@/components/landing/language-provider";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <LandingLanguageProvider>{children}</LandingLanguageProvider>;
}
