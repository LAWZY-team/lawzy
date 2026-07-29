"use client";

import React from "react";
import Image from "next/image";
import {
  FileCheck2,
  Files,
  Languages,
  RotateCcw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FillPanel } from "./fill-panel";
import { ProfilePanel } from "./profile-panel";
import { TemplatePanel } from "./template-panel";
import { UsageGuideDialog } from "./usage-guide-dialog";
import { useLawfirmDemoWorkspace } from "./use-lawfirm-demo-workspace";

type View = "profiles" | "templates" | "fill";

const nav = {
  vi: [
    { id: "profiles" as const, label: "Hồ sơ khách hàng", icon: Users },
    { id: "templates" as const, label: "Bộ hồ sơ mẫu", icon: Files },
    { id: "fill" as const, label: "Điền hồ sơ", icon: FileCheck2 },
  ],
  en: [
    { id: "profiles" as const, label: "Client profiles", icon: Users },
    { id: "templates" as const, label: "Template sets", icon: Files },
    { id: "fill" as const, label: "Fill documents", icon: FileCheck2 },
  ],
};

export function LawfirmDemoShell() {
  const workspace = useLawfirmDemoWorkspace();
  const [view, setView] = React.useState<View>("profiles");
  const locale = workspace.locale;

  if (!workspace.ready) {
    return (
      <main className="min-h-[100dvh] bg-white p-5">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
          <div className="h-[calc(100dvh-2.5rem)] animate-pulse rounded-md bg-zinc-100" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-md bg-zinc-100" />
            <div className="h-64 animate-pulse rounded-md bg-zinc-100" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white text-zinc-950">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-200 bg-white lg:sticky lg:top-0 lg:h-[100dvh] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="flex h-24 items-center justify-between border-b border-zinc-200 px-5 lg:px-8">
              <Image
                src="/logo/lawzy-logo-black.png"
                alt="Lawzy"
                width={188}
                height={56}
                className="h-14 w-auto object-contain"
                priority
              />
            </div>

            <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:overflow-visible lg:py-4">
              {nav[locale].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition active:scale-[0.98] lg:w-full",
                      view === item.id
                        ? "bg-zinc-100 text-zinc-950"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto hidden border-t border-zinc-200 p-3 lg:block">
              <div className="mb-2">
                <UsageGuideDialog locale={locale} />
              </div>
              <Button
                type="button"
                variant="outline"
                className="mb-2 w-full justify-start border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
                onClick={() => workspace.setLocale(locale === "vi" ? "en" : "vi")}
              >
                <Languages className="size-4" />
                {locale === "vi" ? "English" : "Tiếng Việt"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
                onClick={() => {
                  if (
                    window.confirm(
                      locale === "vi"
                        ? "Khôi phục dữ liệu mẫu và xóa các chỉnh sửa hiện tại?"
                        : "Restore sample data and remove current edits?",
                    )
                  ) {
                    workspace.reset();
                    setView("profiles");
                  }
                }}
              >
                <RotateCcw className="size-4" />
                {locale === "vi" ? "Khôi phục dữ liệu mẫu" : "Restore sample data"}
              </Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-5 py-2 lg:hidden">
            <UsageGuideDialog locale={locale} compact />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => workspace.setLocale(locale === "vi" ? "en" : "vi")}
            >
              <Languages className="size-4" />
              {locale === "vi" ? "EN" : "VI"}
            </Button>
          </div>
          {view === "profiles" && workspace.activeProfile && (
            <ProfilePanel
              locale={locale}
              profiles={workspace.profiles}
              activeProfile={workspace.activeProfile}
              onSelect={workspace.setActiveProfileId}
              onAdd={() => workspace.addProfile()}
              onDelete={workspace.deleteProfile}
              onUpdate={workspace.updateProfile}
            />
          )}
          {view === "templates" && workspace.activeTemplate && (
            <TemplatePanel
              locale={locale}
              profiles={workspace.profiles}
              templates={workspace.templates}
              activeTemplate={workspace.activeTemplate}
              activeProfileId={workspace.activeProfileId}
              onSelectTemplate={workspace.setActiveTemplateId}
              onSelectProfile={workspace.setActiveProfileId}
              onAddTemplate={workspace.addTemplate}
              onDeleteTemplate={workspace.deleteTemplate}
              onUpdateTemplate={workspace.updateTemplate}
              onAddProfile={workspace.addProfile}
              onUpdateProfile={workspace.updateProfile}
            />
          )}
          {view === "fill" && (
            <FillPanel
              locale={locale}
              profiles={workspace.profiles}
              templates={workspace.templates}
              activeProfileId={workspace.activeProfileId}
              activeTemplateId={workspace.activeTemplateId}
              onSelectProfile={workspace.setActiveProfileId}
              onSelectTemplate={workspace.setActiveTemplateId}
            />
          )}
        </section>
      </div>
    </main>
  );
}
