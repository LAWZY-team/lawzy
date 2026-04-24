"use client";

/**
 * Canvas editor cho hợp đồng — hiển thị và chỉnh sửa nội dung từ template hoặc AI.
 * Bố cục chuẩn VN (quốc hiệu, tiêu đề căn giữa, căn cứ/lời mở đầu/điều khoản căn trái)
 * được định nghĩa trong src/lib/contract-layout.ts và áp dụng khi render preview (template-preview).
 * Nội dung load từ template đã có align/divider; khi cần căn chỉnh trong editor có thể bổ sung
 * extension text-align cho TipTap.
 */
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, Editor } from "@tiptap/react";
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from "@/stores/editor-store";
import { useUserFieldsStore } from "@/stores/user-fields-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { api } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  Play,
  MoreHorizontal,
  FileText,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Undo,
  Redo,
  ChevronDown,
  Download,
  PanelRightOpen,
  PanelRightClose,
  Save,
  Copy,
  HelpCircle,
  Eye,
  EyeOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Share2,
  FileSearch,
  List,
  ListOrdered,
  Indent,
  Outdent,
  ImageIcon,
  Palette,
  Loader2,
  Table as TableIcon,
} from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createPublicShareWithAccessCode } from "@/lib/api/public-shares";
import { sanitizeEditorHtml, sanitizeHtml } from "@/lib/sanitize";
import { convertTipTapToMarkdown } from "@/lib/export/tiptap-to-markdown";
import { useUploadEditorImage } from "@/hooks/editor/use-upload-editor-image";

const CONTRACT_BODY_CLASSES = [
  "min-h-full p-8 pb-32 text-foreground max-w-[850px] mx-auto",
  "[&_.ProseMirror]:min-h-[calc(100%-48px)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-foreground",
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:first:mt-0 [&_h1]:text-center",
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3",
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2",
  "[&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:text-justify",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4",
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4",
  "[&_li]:mb-1",
  "[&_.ProseMirror]:font-['Times_New_Roman',_serif]",
  "[&_.merge-field]:inline-flex [&_.merge-field]:align-baseline",
  "[&_[data-indent='1']]:pl-8",
  "[&_[data-indent='2']]:pl-16",
  "[&_[data-indent='3']]:pl-24",
  "[&_[data-indent='4']]:pl-32",
  "[&_[data-indent='5']]:pl-40",
].join(" ");

const PAGE_HEIGHT_PX = 1122;
const PAGE_HEADER_HEIGHT_PX = 110;
const PAGE_FOOTER_HEIGHT_PX = 90;

const TEXT_COLORS = [
  "#111827",
  "#374151",
  "#6B7280",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
] as const;

const getPublicAppBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === "string") {
    return envUrl.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

interface CanvasEditorProps {
  editor: Editor | null;
  title?: string;
  /** Emit changes up to unify the title state */
  onChangeTitle?: (val: string) => void;
  // onClose: () => void;
  onRun?: () => void;
  isCode?: boolean;
  /** Panel công cụ (Dữ liệu, Thông tin) đang mở */
  toolsPanelOpen?: boolean;
  /** Bật/tắt panel công cụ */
  onToggleTools?: () => void;
  /** Gọi khi chọn "Lưu bản nháp" trong menu */
  onSave?: () => void;
  /** Document ID for seamless transitions */
  documentId?: string | null;
}

export function CanvasEditor({
  editor,
  title = "Hợp đồng chưa đặt tên",
  // onClose,
  onRun,
  isCode = false,
  toolsPanelOpen = true,
  onToggleTools,
  onSave,
  onChangeTitle,
  documentId: propDocumentId,
}: CanvasEditorProps) {
  const { t } = useT();
  const [docTitle, setDocTitle] = useState(title);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const uploadEditorImageMutation = useUploadEditorImage();
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id) ?? "";
  const params = useParams();
  const documentId =
    propDocumentId ||
    ((params && typeof (params as { id?: unknown }).id === "string")
      ? String((params as { id?: unknown }).id)
      : "");

  useEffect(() => {
    if (title && title !== docTitle) {
      setDocTitle(title);
    }
  }, [title, docTitle]);
  
  // Track ONLY the keys of merge fields to build the toggle list, preventing re-renders on every keystroke
  // `useShallow` prevents the infinite loop from returning a new Array reference on every check
  const mergeFieldKeys = useEditorStore(useShallow((state: { mergeFieldValues: Record<string, string> }) => Object.keys(state.mergeFieldValues)));
  const templateMergeFields = useEditorStore((state) => state.templateMergeFields);
  const {
    customFields,
    hiddenFieldKeys,
    toggleHiddenFieldKey,
    hideAll,
    showAll,
  } = useUserFieldsStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareRecipientEmail, setShareRecipientEmail] = useState<string>("");
  const [shareAccessCode, setShareAccessCode] = useState<string | null>(null);

  const fieldsForToggles = useMemo(() => {
    // Only re-check lists when the keys change or custom/template fields are added
    const keySet = new Set<string>(mergeFieldKeys);
    for (const f of customFields) keySet.add(f.key);
    for (const f of templateMergeFields ?? []) keySet.add(f.fieldKey);

    const customLabelByKey = new Map(customFields.map((f) => [f.key, f.label]));
    const templateLabelByKey = new Map(
      (templateMergeFields ?? []).map((f) => [f.fieldKey, f.label]),
    );

    return Array.from(keySet)
      .filter((k) => k && k.trim() !== "")
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        key,
        label: customLabelByKey.get(key) ?? templateLabelByKey.get(key) ?? key,
      }));
  }, [mergeFieldKeys, customFields, templateMergeFields]);

  const currentFontFamily = editor?.getAttributes("textStyle")?.fontFamily as
    | string
    | undefined;
  const currentFontSize = editor?.getAttributes("textStyle")?.fontSize as
    | string
    | undefined;

  const fontFamilyLabel =
    (currentFontFamily && currentFontFamily.length > 0
      ? currentFontFamily
      : undefined) ?? t("editor_font_default");
  const fontSizeLabel =
    (currentFontSize && currentFontSize.length > 0
      ? currentFontSize
      : undefined) ?? t("editor_font_size");
  const currentTextColor = editor?.getAttributes("textStyle")?.color as
    | string
    | undefined;

  const executeInsertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      if (!workspaceId) {
        toast.error(t("editor_image_workspace_required"));
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(t("editor_image_type_error"));
        return;
      }
      try {
        const uploadResult = await uploadEditorImageMutation.mutateAsync({
          file,
          workspaceId,
        });
        const imageSource = `/api/proxy/files/${uploadResult.id}/download`;
        editor.chain().focus().setImage({ src: imageSource }).run();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t("editor_image_upload_failed");
        toast.error(errorMessage);
      }
    },
    [editor, uploadEditorImageMutation, workspaceId],
  );

  const handlePickImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;
      await executeInsertImage(selectedFile);
      event.target.value = "";
    },
    [executeInsertImage],
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view) return;
    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest ancestor or the target itself that has data-field-key
      const fieldEl = target.closest('[data-field-key]');
      if (fieldEl) {
        const fieldKey = fieldEl.getAttribute('data-field-key');
        if (fieldKey) {
          // Dispatch a custom event to focus the field in the RightPanel
          if (!toolsPanelOpen && onToggleTools) {
            // Defer the state update to avoid interfering with TipTap's native event loop
            setTimeout(() => onToggleTools(), 0);
          }
          window.dispatchEvent(new CustomEvent('lawzy:focus-field', { detail: { fieldKey } }));
        }
      }
    };
    
    const dom = editor.view.dom;
    dom.addEventListener('click', handleEditorClick);
    return () => dom.removeEventListener('click', handleEditorClick);
  }, [editor, toolsPanelOpen, onToggleTools]);

  // Sync canvas view when a field is focused from the RightPanel (e.g., via Enter key)
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view) return;

    const handleCanvasShowField = (e: Event) => {
      const fieldKey = (e as CustomEvent).detail?.fieldKey;
      if (!fieldKey) return;

      // Find the element in the editor DOM
      const dom = editor.view.dom;
      const fieldEl = dom.querySelector(`[data-field-key="${fieldKey}"]`);
      
      if (fieldEl) {
        fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a temporary highlight effect (styled to match common UI patterns)
        fieldEl.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'transition-all', 'duration-300');
        setTimeout(() => {
          fieldEl.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 1500);
      }
    };

    window.addEventListener('lawzy:canvas-show-field', handleCanvasShowField);
    return () => window.removeEventListener('lawzy:canvas-show-field', handleCanvasShowField);
  }, [editor]);

  if (!editor) return null;

  /** Convert editor HTML to final HTML (replace merge fields; apply hide rules; strip merge-field styling) */
  const finalizeContractHtml = (rawHtml: string): string => {
    const sanitized = sanitizeEditorHtml(rawHtml);
    const currentValues = useEditorStore.getState().mergeFieldValues;
    if (Object.keys(currentValues).length === 0) return sanitized;

    const div = document.createElement("div");
    div.innerHTML = sanitized;
    div.querySelectorAll("[data-field-key]").forEach((el) => {
      const key = el.getAttribute("data-field-key");
      if (!key) return;

      const isHidden = hiddenFieldKeys.includes(key);
      const value = currentValues[key];

      if (isHidden) {
        // Export behavior: hidden fields should become blank whitespace (not show label/key)
        // Use nbsp to avoid collapsing to nothing in HTML/Word rendering.
        el.textContent = "\u00A0";
      } else if (value !== undefined && value !== "") {
        el.textContent = value;
      } else {
        return;
      }
      el.classList.remove("merge-field");
      (el as HTMLElement).style.fontWeight = "inherit";
      (el as HTMLElement).style.background = "none";
      (el as HTMLElement).style.border = "none";
      (el as HTMLElement).style.padding = "0";
    });
    return div.innerHTML;
  };

  const getFinalHtml = (): string => finalizeContractHtml(editor.getHTML());

  const getFinalExportContent = (excludeFirstHeading = false): JSONContent => {
    const json = editor.getJSON() as JSONContent;

    const transformNode = (node: JSONContent): JSONContent => {
      if (!node) return node;

      if (node.type === "mergeField") {
        const attrs = (node as { attrs?: { fieldKey?: string } }).attrs;
        const fieldKey = attrs?.fieldKey;
        const isHidden = fieldKey ? hiddenFieldKeys.includes(fieldKey) : false;
        
        // Lookup dynamic value without reactive binding
        const value = fieldKey ? useEditorStore.getState().mergeFieldValues[fieldKey] : undefined;

        if (isHidden) {
          return { type: "text", text: "\u00A0" };
        }

        if (value !== undefined && value !== "") {
          return { type: "text", text: value };
        }

        return { type: "text", text: "" };
      }

      if (node.content && Array.isArray(node.content)) {
        return {
          ...node,
          content: node.content.map((child) =>
            transformNode(child as JSONContent),
          ),
        };
      }

      return node;
    };

    let finalContent = (json.content ?? []).map((node) => transformNode(node as JSONContent));
    
    if (excludeFirstHeading && finalContent.length > 0) {
      // Find the first heading level 1 and skip it
      if (finalContent[0].type === "heading" && finalContent[0].attrs?.level === 1) {
        finalContent = finalContent.slice(1);
        // Also skip empty paragraph immediately after title if exists
        if (finalContent.length > 0 && finalContent[0].type === "paragraph" && (!finalContent[0].content || finalContent[0].content.length === 0)) {
          finalContent = finalContent.slice(1);
        }
      }
    }

    return {
      ...json,
      content: finalContent,
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePrint = () => {
    const html = getFinalHtml();
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle || "Hợp đồng"}</title>
      <style>
        body{font-family:system-ui,serif;max-width:210mm;margin:auto;padding:20px;line-height:1.6}
        h1{font-size:1.5rem;margin:0.5em 0}h2{font-size:1.25rem;margin:0.5em 0}p{margin:0.4em 0}
        ul,ol{padding-left:20px;margin-bottom:10px}
        [data-indent="1"]{padding-left:30px}
        [data-indent="2"]{padding-left:60px}
        [data-indent="3"]{padding-left:90px}
        [data-indent="4"]{padding-left:120px}
        [data-indent="5"]{padding-left:150px}
      </style></head>
      <body>${html}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportWord = async () => {
    if (!editor) return;

    try {
      const exportContent = getFinalExportContent(false);
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: exportContent,
          metadata: { title: docTitle || "Hợp đồng" },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to export Word");
      }

      const blob = await res.blob();

      // Persist export output to workspace storage (counts towards usage)
      try {
        if (workspaceId) {
          const form = new FormData();
          form.append("file", new File([blob], `${docTitle || "Hợp đồng"}.docx`, { type: blob.type }));
          form.append("workspaceId", workspaceId);
          if (documentId) form.append("documentId", documentId);
          await api.upload("/files/upload-export", form);
          queryClient.invalidateQueries({ queryKey: ["files"] });
          queryClient.invalidateQueries({ queryKey: ["files", "storage", workspaceId] });
          queryClient.invalidateQueries({ queryKey: ["dashboard", "quota", workspaceId] });
        }
      } catch (e) {
        console.error("Persist export failed", e);
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${docTitle || "Hợp đồng"}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error(t("editor_export_word_failed"));
    }
  };


  const handleCopyContent = async () => {
    if (!editor) return;
    const text = editor.getText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("editor_copy_content_success"));
    } catch {
      toast.error(t("editor_copy_content_failed"));
    }
  };

  const handleCopyMarkdown = async () => {
    if (!editor) return;
    try {
      const exportContent = getFinalExportContent(false);
      const md = convertTipTapToMarkdown(exportContent);
      await navigator.clipboard.writeText(md);
      toast.success(t("editor_copy_markdown_success"));
    } catch {
      toast.error(t("editor_copy_markdown_failed"));
    }
  };

  const handleOpenGoogleDocs = async () => {
    if (!editor) return;
    try {
      const exportContent = getFinalExportContent(false);
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: exportContent,
          metadata: { title: docTitle || "Hợp đồng" },
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const file = new File([blob], `${docTitle || "Hợp đồng"}.docx`, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&convert=true",
        { method: "POST", body: formData }
      ).catch(() => null);
      if (uploadRes?.ok) {
        const data = await uploadRes.json();
        window.open(`https://docs.google.com/document/d/${data.id}/edit`, "_blank");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${docTitle || "Hợp đồng"}.docx`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Đã tải file DOCX — mở bằng Google Docs để chỉnh sửa tiếp");
      }
    } catch {
      toast.error("Không thể xuất Google Docs");
    }
  };

  const handleCreateShareLink = async () => {
    try {
      setShareLoading(true);
      setShareUrl(null);
      setShareAccessCode(null);

      const email = shareRecipientEmail.trim();
      if (!email) {
        toast.error(t("editor_share_email_required"));
        return;
      }

      const data = await createPublicShareWithAccessCode({
        title: docTitle || undefined,
        html: getFinalHtml(),
        recipientEmail: email,
      });
      const baseUrl = getPublicAppBaseUrl();
      const url = `${baseUrl}/share/${data.token}`;
      setShareUrl(url);
      setShareAccessCode(data.accessCode);
      toast.success(t("editor_share_success"));
    } catch (e) {
      console.error(e);
      toast.error(t("editor_share_failed"));
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("editor_share_copy_success"));
    } catch {
      toast.error(t("editor_share_copy_failed"));
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-3xl overflow-hidden border border-border my-2 mr-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background z-20 sticky top-0">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <input
            value={docTitle}
            onChange={(e) => {
              setDocTitle(e.target.value);
              onChangeTitle?.(e.target.value);
            }}
            className="min-w-0 w-full max-w-md bg-transparent border-none outline-none font-medium text-sm text-foreground truncate hover:bg-muted/50 px-2 py-1 rounded transition-colors"
          />
        </div>

        <div className="flex items-center gap-1">
          {isCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRun}
              className="text-foreground hover:bg-accent gap-2 h-8 px-3 rounded-full mr-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="text-xs font-medium">{t("editor_btn_check")}</span>
            </Button>
          )}

          {onSave && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSave}
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
              title={t("editor_btn_save_draft")}
            >
              <Save className="w-4 h-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
                title={t("editor_btn_export")}
              >
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border text-popover-foreground"
            >
              {/* <DropdownMenuItem
                onClick={handlePrint}
                className="hover:bg-accent cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" /> In / Lưu PDF
              </DropdownMenuItem> */}
              {/* <DropdownMenuItem
                onClick={handleExportPdf}
                className="hover:bg-accent cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" /> Xuất PDF
              </DropdownMenuItem> */}
              <DropdownMenuItem
                onClick={handleExportWord}
                className="hover:bg-accent cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-2" /> {t("editor_btn_export_word")}
              </DropdownMenuItem>
              {/* <DropdownMenuItem
                onClick={handleOpenGoogleDocs}
                className="hover:bg-accent cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-2" /> Mở trong Google Docs
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCopyMarkdown}
                className="hover:bg-accent cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-2" /> {t("editor_btn_copy_markdown")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
            title={t("editor_btn_preview")}
            onClick={() => setPreviewOpen(true)}
          >
            <FileSearch className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
            title={t("editor_btn_share")}
            onClick={() => {
              setShareOpen(true);
              setShareUrl(null);
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
                title={t("editor_btn_toggle_fields")}
              >
                {hiddenFieldKeys.length > 0 ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border text-popover-foreground w-[280px]"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("editor_menu_fields_visibility")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="hover:bg-accent cursor-pointer text-sm"
                onClick={() => hideAll(fieldsForToggles.map((f) => f.key))}
              >
                <EyeOff className="w-4 h-4 mr-2" /> {t("editor_menu_hide_all")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-accent cursor-pointer text-sm"
                onClick={() => showAll()}
              >
                <Eye className="w-4 h-4 mr-2" /> {t("editor_menu_show_all")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {fieldsForToggles.length === 0 ? (
                <DropdownMenuItem className="text-muted-foreground" disabled>
                  {t("editor_menu_no_fields")}
                </DropdownMenuItem>
              ) : (
                fieldsForToggles.map((f) => (
                  <DropdownMenuCheckboxItem
                    key={f.key}
                    checked={hiddenFieldKeys.includes(f.key)}
                    onCheckedChange={() => toggleHiddenFieldKey(f.key)}
                    className="hover:bg-accent cursor-pointer"
                    title={f.key}
                  >
                    <span className="truncate">{f.label}</span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
                title={t("editor_btn_more")}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border text-popover-foreground"
            >
              <DropdownMenuItem
                onClick={handleCopyContent}
                className="hover:bg-accent cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-2" /> {t("editor_btn_copy_content")}
              </DropdownMenuItem>
              {/* <DropdownMenuSeparator className="bg-border" /> */}
              <DropdownMenuItem
                className="hover:bg-accent cursor-pointer"
                onClick={() => toast.info("Trợ giúp: Liên hệ contact@lawzy.vn")}
              >
                <HelpCircle className="w-4 h-4 mr-2" /> {t("editor_btn_help")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onToggleTools && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTools}
              className={cn(
                "h-8 w-8 rounded-full",
                toolsPanelOpen
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={toolsPanelOpen ? t("editor_panel_close") : t("editor_panel_open")}
            >
              {toolsPanelOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div 
        className="px-4 py-2 border-b border-border bg-background flex items-center flex-nowrap gap-1 overflow-x-auto min-w-0 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleImageInputChange}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
            >
              <span className="text-xs">{t('editor_text_style') || 'Kiểu văn bản'}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
              className="hover:bg-accent"
            >
              {t('editor_paragraph') || 'Văn bản thường'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className="hover:bg-accent"
            >
              {t('editor_heading_1') || 'Tiêu đề 1'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className="hover:bg-accent"
            >
              {t('editor_heading_2') || 'Tiêu đề 2'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className="hover:bg-accent"
            >
              {t('editor_heading_3') || 'Tiêu đề 3'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
            >
              <span className="text-xs truncate max-w-[120px]">
                {fontFamilyLabel}
              </span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().unsetFontFamily().run()}
              className="hover:bg-accent"
            >
              {t("editor_font_default")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            {["Times New Roman", "Arial", "Inter", "Courier New"].map((ff) => (
              <DropdownMenuItem
                key={ff}
                onClick={() => editor.chain().focus().setFontFamily(ff).run()}
                className="hover:bg-accent"
              >
                {ff}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
            >
              <span className="text-xs">{fontSizeLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().unsetFontSize().run()}
              className="hover:bg-accent"
            >
              {t("editor_font_default")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            {[
              "8pt",
              "9pt",
              "10pt",
              "11pt",
              "12pt",
              "13pt",
              "14pt",
              "16pt",
              "18pt",
              "20pt",
              "24pt",
              "28pt",
              "36pt",
              "48pt",
              "72pt",
            ].map((sz) => (
              <DropdownMenuItem
                key={sz}
                onClick={() => editor.chain().focus().setFontSize(sz).run()}
                className="hover:bg-accent"
              >
                {sz}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
              title={t("editor_text_color")}
            >
              <Palette className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground w-52">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="hover:bg-accent"
            >
              {t("editor_text_color_default")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <div className="grid grid-cols-5 gap-2 px-2 py-2">
              {TEXT_COLORS.map((colorHex) => (
                <button
                  key={colorHex}
                  type="button"
                  className={cn(
                    "h-6 w-6 rounded-full border border-border transition-transform hover:scale-105",
                    currentTextColor === colorHex && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  style={{ backgroundColor: colorHex }}
                  onClick={() => editor.chain().focus().setColor(colorHex).run()}
                  title={colorHex}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border mx-2"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
              title={t("editor_align_left") || "Căn chỉnh"}
            >
              {editor.isActive({ textAlign: "center" }) ? (
                <AlignCenter className="w-4 h-4" />
              ) : editor.isActive({ textAlign: "right" }) ? (
                <AlignRight className="w-4 h-4" />
              ) : editor.isActive({ textAlign: "justify" }) ? (
                <AlignJustify className="w-4 h-4" />
              ) : (
                <AlignLeft className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground min-w-0 p-1">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                className={cn(
                  "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
                  (editor.isActive({ textAlign: "left" }) || (!editor.isActive({ textAlign: "center" }) && !editor.isActive({ textAlign: "right" }) && !editor.isActive({ textAlign: "justify" }))) && "bg-accent text-foreground"
                )}
                title={t("editor_align_left")}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                className={cn(
                  "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
                  editor.isActive({ textAlign: "center" }) && "bg-accent text-foreground"
                )}
                title={t("editor_align_center")}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                className={cn(
                  "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
                  editor.isActive({ textAlign: "right" }) && "bg-accent text-foreground"
                )}
                title={t("editor_align_right")}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                className={cn(
                  "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
                  editor.isActive({ textAlign: "justify" }) && "bg-accent text-foreground"
                )}
                title={t("editor_align_justify")}
              >
                <AlignJustify className="w-4 h-4" />
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0",
            editor.isActive("bold") && "bg-accent text-foreground",
          )}
          title={t("editor_bold")}
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0",
            editor.isActive("italic") && "bg-accent text-foreground",
          )}
          title={t("editor_italic")}
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0",
            editor.isActive("underline") && "bg-accent text-foreground",
          )}
          title={t("editor_underline")}
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handlePickImage}
          disabled={uploadEditorImageMutation.isPending}
          className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 disabled:opacity-30"
          title={t("editor_insert_image")}
        >
          {uploadEditorImageMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </Button>

        <div className="h-4 w-px bg-border mx-2"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0",
            editor.isActive("bulletList") && "bg-accent text-foreground",
          )}
          title={t("editor_bullet_list")}
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0",
            editor.isActive("orderedList") && "bg-accent text-foreground",
          )}
          title={t("editor_ordered_list")}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().indent().run()}
          className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
          title={t("editor_indent_increase")}
        >
          <Indent className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().outdent().run()}
          className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
          title={t("editor_indent_decrease")}
        >
          <Outdent className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent shrink-0",
                editor.isActive("table") && "bg-accent text-foreground",
              )}
              title={t("editor_table_menu")}
            >
              <TableIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground w-56">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()}
              className="hover:bg-accent"
            >
              {t("editor_table_insert")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowBefore().run()}
              disabled={!editor.can().addRowBefore()}
              className="hover:bg-accent"
            >
              {t("editor_table_add_row_before")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
              className="hover:bg-accent"
            >
              {t("editor_table_add_row_after")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
              className="hover:bg-accent"
            >
              {t("editor_table_delete_row")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!editor.can().addColumnBefore()}
              className="hover:bg-accent"
            >
              {t("editor_table_add_column_before")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
              className="hover:bg-accent"
            >
              {t("editor_table_add_column_after")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
              className="hover:bg-accent"
            >
              {t("editor_table_delete_column")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().mergeCells().run()}
              disabled={!editor.can().mergeCells()}
              className="hover:bg-accent"
            >
              {t("editor_table_merge_cells")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().splitCell().run()}
              disabled={!editor.can().splitCell()}
              className="hover:bg-accent"
            >
              {t("editor_table_split_cell")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().deleteTable().run()}
              disabled={!editor.can().deleteTable()}
              className="hover:bg-accent text-destructive focus:text-destructive"
            >
              {t("editor_table_delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border mx-2 shrink-0"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 shrink-0"
          title={t("editor_undo")}
        >
          <Undo className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 shrink-0"
          title={t("editor_redo")}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Body — full width của cột; nội dung dùng hết chiều ngang trên màn hình lớn */}
      <div className="flex-1 overflow-auto relative bg-muted/20">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundSize: `100% ${PAGE_HEIGHT_PX}px`,
            backgroundImage: `linear-gradient(
              to bottom,
              transparent ${PAGE_HEADER_HEIGHT_PX - 1}px,
              hsl(var(--border)) ${PAGE_HEADER_HEIGHT_PX}px,
              transparent ${PAGE_HEADER_HEIGHT_PX + 1}px,
              transparent ${PAGE_HEIGHT_PX - PAGE_FOOTER_HEIGHT_PX - 1}px,
              hsl(var(--border)) ${PAGE_HEIGHT_PX - PAGE_FOOTER_HEIGHT_PX}px,
              transparent ${PAGE_HEIGHT_PX - PAGE_FOOTER_HEIGHT_PX + 1}px,
              transparent ${PAGE_HEIGHT_PX - 1}px,
              hsl(var(--border)) ${PAGE_HEIGHT_PX}px
            )`,
          }}
        />
        <div className="relative w-full max-w-[min(100%,96rem)] mx-auto min-h-full [&_.tiptap]:max-w-none [&_.tiptap]:w-full [&_.ProseMirror]:max-w-none [&_.ProseMirror]:w-full">
          <div className="pointer-events-none absolute right-6 top-3 z-10 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Header
          </div>
          <div className="pointer-events-none absolute right-6 bottom-3 z-10 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Footer
          </div>
          <EditorContent editor={editor} className={cn(CONTRACT_BODY_CLASSES, "relative z-10")} />
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("editor_preview_title")}</DialogTitle>
            <DialogDescription>
              {t("editor_preview_desc")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div
              className={cn(CONTRACT_BODY_CLASSES)}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(getFinalHtml()) }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editor_share_title")}</DialogTitle>
            <DialogDescription>
              {t("editor_share_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("editor_share_recipient_email")}</label>
              <input
                type="email"
                value={shareRecipientEmail}
                onChange={(e) => setShareRecipientEmail(e.target.value)}
                placeholder="nguoiki@example.com"
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateShareLink}
              disabled={shareLoading}
            >
              {shareLoading ? t("editor_share_creating") : t("editor_share_create_btn")}
            </Button>
            {shareUrl && (
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("editor_share_link_label")}</div>
                <div className="flex items-center gap-2">
                  <input
                    value={shareUrl}
                    readOnly
                    className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyShareLink}
                  >
                    {t("editor_share_copy_btn")}
                  </Button>
                </div>
                {shareAccessCode && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {t("editor_share_access_code_label")}
                    </div>
                    <input
                      value={shareAccessCode}
                      readOnly
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm font-mono tracking-[0.3em]"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("editor_share_access_code_hint")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
