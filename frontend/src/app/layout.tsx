import type { Metadata } from "next";
import { Lora } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { Analytics } from "@/components/analytics";
import type { Locale } from "@/lib/i18n";
import { getAppUrl, isRobotIndexingAllowed } from "@/lib/seo/site-env";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const allowRobotIndexing = isRobotIndexingAllowed();

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    template: "%s | LAWZY",
    default: "LAWZY - Nền tảng quản lý hợp đồng pháp lý",
  },
  description: "Tạo, chỉnh sửa, review và quản lý hợp đồng pháp luật theo luật Việt Nam 2026",
  applicationName: "LAWZY",
  keywords: ["hợp đồng", "phân tích", "AI", "pháp lý", "contract review"],
  category: "legal",
  alternates: {
    canonical: "/",
  },
  robots: allowRobotIndexing
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      },
  openGraph: {
    title: "LAWZY - Nền tảng quản lý hợp đồng pháp lý",
    description: "Tạo, chỉnh sửa, review và quản lý hợp đồng pháp luật theo luật Việt Nam 2026",
    url: "/",
    siteName: "LAWZY",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/logo/lawzy-logo-whitebg.png",
        alt: "LAWZY",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LAWZY - Nền tảng quản lý hợp đồng pháp lý",
    description: "Tạo, chỉnh sửa, review và quản lý hợp đồng pháp luật theo luật Việt Nam 2026",
    images: ["/logo/lawzy-logo-whitebg.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lawzy_lang")?.value;
  const initialLocale: Locale =
    langCookie === "en" || langCookie === "vi" ? langCookie : "vi";
  const htmlLang = initialLocale === "en" ? "en" : "vi";

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${lora.variable} font-sans antialiased`}
      >
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          forcedTheme="light"
        >
          <Providers initialLocale={initialLocale}>{children}</Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
