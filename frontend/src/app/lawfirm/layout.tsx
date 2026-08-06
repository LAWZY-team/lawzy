import type { Metadata } from "next";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";

export const metadata: Metadata = {
  title: "Law Firm Workspace | LAWZY",
  robots: { index: false, follow: false },
};

export default function LawfirmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthBootstrap />
      {children}
    </>
  );
}
