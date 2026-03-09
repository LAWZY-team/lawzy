"use client"

import * as React from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

interface HeaderProps {
  title?: string
  children?: React.ReactNode
}

export function Header({ title, children }: HeaderProps) {

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {title && (
        <div className="flex flex-1 items-center gap-2">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {children}
        {/* Theme toggle removed - always light mode */}
      </div>
    </header>
  )
}
