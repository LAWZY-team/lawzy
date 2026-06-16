import { cookies } from "next/headers";
import { LandingLanguageProvider } from "@/components/landing/language-provider";
import type { Locale } from "@/lib/i18n";

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lawzy_lang")?.value;
  const initialLocale: Locale =
    langCookie === "en" || langCookie === "vi" ? langCookie : "vi";

  return (
    <LandingLanguageProvider initialLocale={initialLocale}>
      {children}
    </LandingLanguageProvider>
  );
}
