import { ContactModalProvider } from "@/components/landing/contact-modal";

export default function LandingProductsLayout({ children }: { children: React.ReactNode }) {
  return <ContactModalProvider>{children}</ContactModalProvider>;
}
