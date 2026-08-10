"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FileCheck2,
  Files,
  Languages,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FillPanel } from "./fill-panel";
import { LawfirmAccountBar } from "./lawfirm-account-bar";
import { ProfilePanel } from "./profile-panel";
import { TemplatePanel } from "./template-panel";
import { UsageGuideDialog } from "./usage-guide-dialog";
import { useLawfirmShellWorkspace } from "@/hooks/lawfirm/use-lawfirm-shell-workspace";
import { lawfirmFillRunsApi } from "@/lib/api/lawfirm/lawfirm-api";

import { useSessionKeepalive } from "@/hooks/use-session-keepalive";

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
  useSessionKeepalive();
  const workspace = useLawfirmShellWorkspace();
  const locale = workspace.locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const view: View =
    viewParam === "templates" || viewParam === "fill" ? viewParam : "profiles";
  const mode = searchParams.get("mode") === "editor" ? "editor" : searchParams.get("mode") === "preview" ? "preview" : "library";

  const navigateToView = React.useCallback(
    (nextView: View, nextMode: "library" | "editor" | "preview" = "library") => {
      const params = new URLSearchParams({ view: nextView });
      if (nextView !== "fill" && nextMode !== "library") {
        params.set("mode", nextMode);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  if (!workspace.ready) {
    return (
      <main className="min-h-[100dvh] bg-white p-5">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="h-[calc(100dvh-2.5rem)] animate-pulse rounded-md bg-zinc-100" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-md bg-zinc-100" />
            <div className="h-64 animate-pulse rounded-md bg-zinc-100" />
          </div>
        </div>
      </main>
    );
  }

  if (workspace.error) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-white p-6">
        <div className="max-w-md rounded-md border border-zinc-200 p-6 text-center">
          <p className="text-sm text-zinc-600">
            {locale === "vi"
              ? "Không thể tải dữ liệu hồ sơ. Vui lòng thử lại."
              : "Could not load workspace data. Please try again."}
          </p>
          <Button type="button" className="mt-4" onClick={() => workspace.refetch()}>
            {locale === "vi" ? "Thử lại" : "Retry"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen max-w-full overflow-hidden bg-white text-zinc-950">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] overflow-hidden">
        <aside className="border-b border-zinc-200 bg-white lg:h-full lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 font-semibold tracking-wide text-zinc-950">
              <span className="text-sm font-bold tracking-tight">LAWZY LAWFIRM</span>
            </div>

            <nav className="flex gap-1 overflow-x-auto px-2 py-3 lg:block lg:space-y-1 lg:overflow-visible lg:py-3">
              {nav[locale].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToView(item.id)}
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition active:scale-[0.98] lg:w-full",
                      view === item.id
                        ? "bg-zinc-100 text-zinc-950 font-semibold"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-zinc-200 p-2">
              <LawfirmAccountBar
                locale={locale}
                onLocaleChange={(nextLocale) => workspace.setLocale(nextLocale)}
              />
            </div>
          </div>
        </aside>

        <section className="h-full min-w-0 max-w-full overflow-y-auto">
          {view === "profiles" && (
            <ProfilePanel
              locale={locale}
              mode={mode === "preview" ? "library" : mode}
              profiles={workspace.profiles}
              activeProfile={workspace.activeProfile}
              onSelect={workspace.setActiveProfileId}
              onAdd={() => workspace.addProfile()}
              onDelete={workspace.deleteProfile}
              onUpdate={workspace.updateProfile}
              onModeChange={(next) => navigateToView("profiles", next)}
              onUploadIdentity={(file) => workspace.uploadIdentity(workspace.activeProfile!.id, file)}
              onApproveExtraction={workspace.approveExtraction}
            />
          )}
          {view === "templates" && workspace.activeTemplate && (
            <TemplatePanel
              locale={locale}
              mode={mode === "preview" ? "editor" : mode}
              profiles={workspace.profiles}
              templates={workspace.templates}
              activeTemplate={workspace.activeTemplate}
              activeProfileId={workspace.activeProfileId}
              onSelectTemplate={workspace.setActiveTemplateId}
              onSelectProfile={workspace.setActiveProfileId}
              onAddTemplate={workspace.addTemplate}
              onDeleteTemplate={workspace.deleteTemplate}
              onUpdateTemplate={workspace.updateTemplate}
              onModeChange={(next) => navigateToView("templates", next)}
              onAddProfile={(name) =>
                name ? workspace.addProfileWithName(name) : workspace.addProfile().then(() => workspace.activeProfile!)
              }
              onUpdateProfile={workspace.updateProfile}
              onUpdateDocument={(docId, updater) =>
                workspace.updateDocument(workspace.activeTemplate!.id, docId, updater)
              }
              onScanDocument={workspace.scanTemplateDocument}
              onUploadDocument={(file) =>
                workspace.uploadTemplateDocument(workspace.activeTemplate!.id, file)
              }
              onRemoveDocument={(docId) => workspace.deleteDocument(docId)}
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
              onRunServerFill={workspace.runFill}
              getDownloadUrl={lawfirmFillRunsApi.downloadUrl}
              onUpdateProfile={workspace.updateProfile}
            />
          )}
        </section>
      </div>
    </main>
  );
}
