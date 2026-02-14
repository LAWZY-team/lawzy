import { Metadata } from "next"
import { Bell, FileText, Monitor, Palette, UserCog, Wrench } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "@/components/settings/sidebar-nav"

export const metadata: Metadata = {
  title: "Cài đặt",
  description: "Cài đặt tài khoản và ứng dụng.",
}

const sidebarNavItems = [
  {
    title: "Hồ sơ",
    href: "/settings/profile",
    icon: <UserCog className="w-4 h-4" />,
  },
  {
    title: "Tài khoản",
    href: "/settings/account",
    icon: <Wrench className="w-4 h-4" />,
  },
  {
    title: "Giao diện",
    href: "/settings/appearance",
    icon: <Palette className="w-4 h-4" />,
  },
  {
    title: "Thông báo",
    href: "/settings/notifications",
    icon: <Bell className="w-4 h-4" />,
  },
  {
    title: "Hiển thị",
    href: "/settings/display",
    icon: <Monitor className="w-4 h-4" />,
  },
  {
    title: "Trường dữ liệu",
    href: "/settings/fields",
    icon: <FileText className="w-4 h-4" />,
  },
]

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <div className="shrink-0 p-6 pb-0 md:block">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Cài đặt</h2>
          <p className="text-muted-foreground">
            Quản lý cài đặt tài khoản và tùy chọn email của bạn.
          </p>
        </div>
      </div>

      <Separator className="shrink-0 my-6 mx-6" />

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 pt-0 pb-16">
          <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
            <aside className="-mx-4 lg:mx-3 lg:w-1/5">
              <SidebarNav items={sidebarNavItems} />
            </aside>
            <div className="flex-1 lg:max-w-2xl">{children}</div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
