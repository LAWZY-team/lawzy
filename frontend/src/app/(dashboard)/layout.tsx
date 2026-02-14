import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <div className="flex flex-1 flex-col min-h-0 h-full p-2">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
