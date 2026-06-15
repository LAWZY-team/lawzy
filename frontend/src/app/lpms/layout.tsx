import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { LPMSSidebar } from "@/components/layout/lpms-sidebar"
import { AuthBootstrap } from "@/components/auth/auth-bootstrap"
import { ChatHistoryProvider } from "@/app/contexts/ChatHistoryContext"

export const metadata = {
  title: "LPMS Dashboard - Lawzy",
};

export default function LPMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatHistoryProvider>
      <SidebarProvider className="h-screen overflow-hidden">
        <AuthBootstrap />
        <LPMSSidebar />
        <SidebarInset className="overflow-hidden">
          <div className="flex flex-1 flex-col min-h-0 h-full p-2">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatHistoryProvider>
  );
}
