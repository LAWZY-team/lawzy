"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    TableProperties,
    Sparkles,
    FolderKanban,
    Library,
    Trash2,
    Plus,
    ChevronRight,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarFooter,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UserNav } from "./user-nav";
import { cn } from "@/lib/utils";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { listProjects } from "@/app/lib/lpmsApi";
import type { Project } from "@/components/lpms/shared/types";

const lpmsNavItems = [
    { title: "Tổng quan LPMS", href: "/lpms/dashboard", icon: LayoutDashboard },
    { title: "Trợ lý & Án lệ", href: "/lpms/assistant", icon: Sparkles, collapsible: "assistant" as const },
    { title: "Vụ việc (Matters)", href: "/lpms/matters", icon: FolderKanban, collapsible: "matters" as const },
    { title: "Bóc tách hàng loạt", href: "/lpms/tabular-analysis", icon: TableProperties },
    { title: "Quy trình (Workflows)", href: "/lpms/workflows", icon: Library },
];

export function LPMSSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { state, setOpenMobile } = useSidebar();
    const { chats, deleteChat } = useChatHistoryContext();
    const [recentMatters, setRecentMatters] = React.useState<Project[]>([]);

    React.useEffect(() => {
        listProjects()
            .then((projects) => setRecentMatters(projects.slice(0, 5)))
            .catch(() => setRecentMatters([]));
    }, []);

    return (
        <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="flex flex-row items-center gap-2">
                <div className={cn("flex-1 min-w-0", state === "collapsed" && "hidden")}>
                    <div className="ml-2 flex items-center gap-2 px-2 py-1">
                        <Image
                            src="/logo/lawzy-triangle.png"
                            alt="Lawzy Logo"
                            width={120}
                            height={40}
                            className="h-8 w-auto object-contain scale-120"
                            priority
                        />
                        <div className="flex flex-col">
                            <span className="text-lg font-bold">LPMS</span>
                        </div>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent
                className={cn(
                    "gap-1 px-2 py-1",
                    state === "collapsed" && "flex flex-col items-center gap-3 px-1",
                )}
            >
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {lpmsNavItems.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/lpms/assistant" &&
                                        pathname.startsWith(item.href + "/"));
                                const Icon = item.icon;

                                if (item.collapsible === "assistant") {
                                    const isAssistantActive = pathname.startsWith("/lpms/assistant");
                                    return (
                                        <Collapsible
                                            key={item.href}
                                            asChild
                                            defaultOpen={isAssistantActive}
                                            className="group/collapsible"
                                        >
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        tooltip={item.title}
                                                        isActive={isAssistantActive}
                                                        className="w-full"
                                                    >
                                                        <Icon className="h-4 w-4 shrink-0" />
                                                        <span className="truncate">{item.title}</span>
                                                        <ChevronRight className="ms-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub>
                                                        <SidebarMenuSubItem>
                                                            <div
                                                                onClick={() => {
                                                                    router.push("/lpms/assistant");
                                                                    setOpenMobile(false);
                                                                }}
                                                                className="group mb-1.5 flex w-full cursor-pointer items-center gap-2 rounded-md border-b border-gray-100 px-3 py-1.5 pb-2 text-xs font-medium text-gray-900 transition-colors hover:bg-gray-100/80"
                                                            >
                                                                <Plus className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-950" />
                                                                <span>Tạo chat mới</span>
                                                            </div>
                                                        </SidebarMenuSubItem>
                                                        {!chats ? (
                                                            <SidebarMenuSubItem>
                                                                <div className="px-3 py-1.5 text-xs text-gray-400">
                                                                    Đang tải lịch sử...
                                                                </div>
                                                            </SidebarMenuSubItem>
                                                        ) : chats.length === 0 ? (
                                                            <SidebarMenuSubItem>
                                                                <div className="px-3 py-1.5 text-xs text-gray-400">
                                                                    Chưa có hội thoại nào
                                                                </div>
                                                            </SidebarMenuSubItem>
                                                        ) : (
                                                            chats.map((chat) => {
                                                                const isChatActive =
                                                                    pathname ===
                                                                    `/lpms/assistant/chat/${chat.id}`;
                                                                return (
                                                                    <SidebarMenuSubItem key={chat.id}>
                                                                        <div
                                                                            className={cn(
                                                                                "group flex w-full items-center justify-between rounded-md px-3 py-1 text-xs transition-colors",
                                                                                isChatActive
                                                                                    ? "bg-gray-100 font-medium text-gray-900"
                                                                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                                                            )}
                                                                        >
                                                                            <Link
                                                                                href={`/lpms/assistant/chat/${chat.id}`}
                                                                                onClick={() => setOpenMobile(false)}
                                                                                className="flex-1 cursor-pointer truncate pr-2"
                                                                            >
                                                                                {chat.title || "Cuộc trò chuyện mới"}
                                                                            </Link>
                                                                            <button
                                                                                onClick={async (e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    if (
                                                                                        confirm(
                                                                                            "Bạn có chắc chắn muốn xóa cuộc trò chuyện này?",
                                                                                        )
                                                                                    ) {
                                                                                        await deleteChat(chat.id);
                                                                                        if (isChatActive) {
                                                                                            router.push("/lpms/assistant");
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="cursor-pointer rounded p-0.5 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                                                                                title="Xóa"
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    </SidebarMenuSubItem>
                                                                );
                                                            })
                                                        )}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    );
                                }

                                if (item.collapsible === "matters") {
                                    const isMattersActive = pathname.startsWith("/lpms/matters");
                                    return (
                                        <Collapsible
                                            key={item.href}
                                            asChild
                                            defaultOpen={isMattersActive}
                                            className="group/collapsible"
                                        >
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        tooltip={item.title}
                                                        isActive={isMattersActive}
                                                        className="w-full"
                                                    >
                                                        <Icon className="h-4 w-4 shrink-0" />
                                                        <span className="truncate">{item.title}</span>
                                                        <ChevronRight className="ms-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub>
                                                        <SidebarMenuSubItem>
                                                            <Link
                                                                href="/lpms/matters"
                                                                onClick={() => setOpenMobile(false)}
                                                                className="mb-1.5 flex w-full items-center gap-2 rounded-md border-b border-gray-100 px-3 py-1.5 pb-2 text-xs font-medium text-gray-900 transition-colors hover:bg-gray-100/80"
                                                            >
                                                                <Plus className="h-3.5 w-3.5 text-gray-500" />
                                                                <span>Tất cả vụ việc</span>
                                                            </Link>
                                                        </SidebarMenuSubItem>
                                                        {recentMatters.map((matter) => (
                                                            <SidebarMenuSubItem key={matter.id}>
                                                                <Link
                                                                    href={`/lpms/matters/${matter.id}`}
                                                                    onClick={() => setOpenMobile(false)}
                                                                    className={cn(
                                                                        "block truncate rounded-md px-3 py-1 text-xs transition-colors",
                                                                        pathname.startsWith(
                                                                            `/lpms/matters/${matter.id}`,
                                                                        )
                                                                            ? "bg-gray-100 font-medium text-gray-900"
                                                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                                                    )}
                                                                >
                                                                    {matter.name}
                                                                </Link>
                                                            </SidebarMenuSubItem>
                                                        ))}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    );
                                }

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                                <Icon className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <UserNav />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
