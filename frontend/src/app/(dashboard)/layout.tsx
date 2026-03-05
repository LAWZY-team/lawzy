import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { I18nProvider } from "@/components/i18n-provider"
import { AuthBootstrap } from "@/components/auth/auth-bootstrap"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <I18nProvider>
      <SidebarProvider className="h-screen overflow-hidden">
        <AuthBootstrap />
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <div className="flex flex-1 flex-col min-h-0 h-full p-2">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </I18nProvider>
  )
}
