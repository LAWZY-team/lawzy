import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tin tức | Lawzy",
  description:
    "Cập nhật tin tức, thông báo và kiến thức pháp lý từ Lawzy - Nền tảng quản lý hợp đồng AI",
  openGraph: {
    title: "Tin tức | Lawzy",
    description:
      "Cập nhật tin tức, thông báo và kiến thức pháp lý từ Lawzy - Nền tảng quản lý hợp đồng AI",
    type: "website",
  },
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
