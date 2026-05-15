"use client"

import * as React from "react"
import type { DocContent } from "@/types/template"
import { TemplatePreview } from "@/components/templates/template-preview"
import { communityContractTemplateFile } from "@/lib/templates/community-contract-template-file"
import { sanitizeHtml } from "@/lib/sanitize"
import { cn } from "@/lib/utils"

interface CommunityTemplateDocumentPreviewProps {
  fileName: string
  contentJSON?: DocContent | null
  downloadUrl?: string
  localFile?: File | null
  className?: string
  loadingMessage: string
  unsupportedMessage: string
}

type MammothModule = {
  convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
}

function DocxPreviewSurface({
  fileName,
  downloadUrl,
  localFile,
  loadingMessage,
  unsupportedMessage,
}: Pick<
  CommunityTemplateDocumentPreviewProps,
  "fileName" | "downloadUrl" | "localFile" | "loadingMessage" | "unsupportedMessage"
>) {
  const [html, setHtml] = React.useState("")
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")

  React.useEffect(() => {
    let cancelled = false
    const renderDocxPreview = async () => {
      setStatus("loading")
      try {
        const sourceBuffer = localFile
          ? await localFile.arrayBuffer()
          : downloadUrl
            ? await fetch(downloadUrl, { credentials: "include" }).then(async (response) => {
                if (!response.ok) {
                  throw new Error("Failed to load DOCX preview")
                }
                return response.arrayBuffer()
              })
            : null
        if (!sourceBuffer) {
          throw new Error("Missing DOCX preview source")
        }
        const mammothModule = (await import("mammoth")) as MammothModule
        const result = await mammothModule.convertToHtml({ arrayBuffer: sourceBuffer })
        if (!cancelled) {
          setHtml(sanitizeHtml(result.value))
          setStatus("ready")
        }
      } catch (error) {
        console.error("Failed to render DOCX preview", error)
        if (!cancelled) {
          setHtml("")
          setStatus("error")
        }
      }
    }
    void renderDocxPreview()
    return () => {
      cancelled = true
    }
  }, [downloadUrl, localFile])

  if (status === "error") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {unsupportedMessage}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-muted/10">
      {status === "loading" && (
        <div className="flex min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">
          {loadingMessage}
        </div>
      )}
      <div
        aria-label={fileName}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-full p-4",
          status !== "ready" && "hidden",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

export function CommunityTemplateDocumentPreview({
  fileName,
  contentJSON,
  downloadUrl,
  localFile,
  className,
  loadingMessage,
  unsupportedMessage,
}: CommunityTemplateDocumentPreviewProps) {
  const [pdfSrc, setPdfSrc] = React.useState<string | null>(null)
  const isPdf = communityContractTemplateFile.isPdf(fileName)
  const isDocx = communityContractTemplateFile.isDocx(fileName)

  React.useEffect(() => {
    if (!localFile || !isPdf) {
      setPdfSrc(downloadUrl ?? null)
      return
    }
    const url = URL.createObjectURL(localFile)
    setPdfSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [downloadUrl, isPdf, localFile])

  if (contentJSON?.content?.length) {
    return (
      <TemplatePreview
        contentJSON={contentJSON}
        className={cn("h-full min-h-0 w-full p-5", className)}
      />
    )
  }

  if (isPdf && pdfSrc) {
    return (
      <iframe
        src={pdfSrc}
        className={cn("h-full w-full", className)}
        title={fileName}
      />
    )
  }

  if (isDocx) {
    return (
      <div className={cn("h-full min-h-0", className)}>
        <DocxPreviewSurface
          fileName={fileName}
          downloadUrl={downloadUrl}
          localFile={localFile}
          loadingMessage={loadingMessage}
          unsupportedMessage={unsupportedMessage}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {unsupportedMessage}
    </div>
  )
}
