"use client"

import * as React from "react"
import { MessageSquareText, PanelsTopLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useT } from "@/components/i18n-provider"
import { EditorTemplateBrowser } from "@/components/editor/editor-template-browser"

type LeftWorkspaceMode = "chat" | "templates"

interface EditorLeftWorkspaceProps {
  activeMode: LeftWorkspaceMode
  onActiveModeChange: (mode: LeftWorkspaceMode) => void
  chatContent: React.ReactNode
  onApplySystemTemplate: (templateId: string) => Promise<void> | void
  onApplyContractTemplate: (
    templateId: string,
    scope: "community" | "internal",
  ) => Promise<void> | void
}

export function EditorLeftWorkspace({
  activeMode,
  onActiveModeChange,
  chatContent,
  onApplySystemTemplate,
  onApplyContractTemplate,
}: EditorLeftWorkspaceProps) {
  const { t } = useT()
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-background">
      <Tabs
        value={activeMode}
        onValueChange={(value) => onActiveModeChange(value as LeftWorkspaceMode)}
        className="flex h-full min-h-0 min-w-0 flex-col"
      >
        <div className="border-b px-3 py-3">
          <TabsList className="w-full min-w-0">
            <TabsTrigger value="chat">
              <MessageSquareText className="h-4 w-4" />
              {t("editor_tab_chat")}
            </TabsTrigger>
            <TabsTrigger value="templates">
              <PanelsTopLeft className="h-4 w-4" />
              {t("editor_tab_templates")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {chatContent}
        </TabsContent>

        <TabsContent value="templates" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <EditorTemplateBrowser
            onApplySystemTemplate={onApplySystemTemplate}
            onApplyContractTemplate={onApplyContractTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
